const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();
const PORT = 3002;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const BOT_DIR = path.join(__dirname, '..', 'bot');
const PANEL_DIR = path.join(__dirname, '..', 'panel');

let botProcess = null;
let botStartedAt = null;
let botLogs = [];

let panelProcess = null;
let panelStartedAt = null;
let panelLogs = [];

const MAX_LOGS = 500;

function addBotLog(type, message) {
  const log = { timestamp: new Date().toISOString(), type, message };
  botLogs.unshift(log);
  if (botLogs.length > MAX_LOGS) botLogs.pop();
  console.log(`[BOT] ${type.toUpperCase()}: ${message}`);
}

function addPanelLog(type, message) {
  const log = { timestamp: new Date().toISOString(), type, message };
  panelLogs.unshift(log);
  if (panelLogs.length > MAX_LOGS) panelLogs.pop();
  console.log(`[PANEL] ${type.toUpperCase()}: ${message}`);
}

function isBotRunning() {
  if (!botProcess || botProcess.killed) return false;
  try { process.kill(botProcess.pid, 0); return true; } catch { return false; }
}

function isPanelRunning() {
  if (!panelProcess || panelProcess.killed) return false;
  try { process.kill(panelProcess.pid, 0); return true; } catch { return false; }
}

function killProcess(proc) {
  if (!proc) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { shell: true });
  } else {
    try { process.kill(-proc.pid, 'SIGKILL'); } catch(e) {}
  }
}

// ---------- BOT ----------
app.get('/bot/status', (req, res) => {
  const running = isBotRunning();
  let uptime = null;
  if (running && botStartedAt) uptime = Math.floor((Date.now() - botStartedAt) / 1000);
  res.json({ running, uptime });
});

app.post('/bot/start', (req, res) => {
  if (isBotRunning()) return res.status(400).json({ error: 'Bot już działa' });
  const botEntry = path.join(BOT_DIR, 'index.js');
  if (!fs.existsSync(botEntry)) return res.status(404).json({ error: `Nie znaleziono ${botEntry}` });
  addBotLog('info', 'Uruchamianie bota...');
  botProcess = spawn('node', [botEntry], { cwd: BOT_DIR, detached: false, stdio: 'pipe', shell: true });
  botStartedAt = Date.now();
  botProcess.stdout.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addBotLog('info', line)); });
  botProcess.stderr.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addBotLog('error', line)); });
  botProcess.on('exit', (code) => { addBotLog('info', `Bot zakończył się z kodem ${code}`); botProcess = null; botStartedAt = null; });
  res.json({ success: true });
});

app.post('/bot/stop', (req, res) => {
  if (!isBotRunning()) return res.status(400).json({ error: 'Bot nie jest uruchomiony' });
  addBotLog('info', 'Zatrzymywanie bota');
  killProcess(botProcess);
  botProcess = null;
  botStartedAt = null;
  res.json({ success: true });
});

app.post('/bot/restart', async (req, res) => {
  if (isBotRunning()) {
    killProcess(botProcess);
    let waited = 0;
    while (isBotRunning() && waited < 5000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
  }
  const botEntry = path.join(BOT_DIR, 'index.js');
  if (!fs.existsSync(botEntry)) return res.status(404).json({ error: `Nie znaleziono ${botEntry}` });
  addBotLog('info', 'Restartowanie bota...');
  botProcess = spawn('node', [botEntry], { cwd: BOT_DIR, detached: false, stdio: 'pipe', shell: true });
  botStartedAt = Date.now();
  botProcess.stdout.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addBotLog('info', line)); });
  botProcess.stderr.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addBotLog('error', line)); });
  botProcess.on('exit', (code) => { addBotLog('info', `Bot zakończył się z kodem ${code}`); botProcess = null; botStartedAt = null; });
  res.json({ success: true });
});

app.get('/api/logs', (req, res) => res.json(botLogs));

// ---------- PANEL GŁÓWNY ----------
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

app.get('/panel/status', (req, res) => {
  const running = isPanelRunning();
  let uptime = null;
  if (running && panelStartedAt) uptime = Math.floor((Date.now() - panelStartedAt) / 1000);
  res.json({ running, uptime });
});

app.post('/panel/start', (req, res) => {
  if (isPanelRunning()) return res.status(400).json({ error: 'Panel już działa' });
  addPanelLog('info', 'Uruchamianie panelu głównego...');
  panelProcess = spawn(npmCmd, ['run', 'dev'], { cwd: PANEL_DIR, detached: false, stdio: 'pipe', shell: true });
  panelStartedAt = Date.now();
  panelProcess.stdout.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addPanelLog('info', line)); });
  panelProcess.stderr.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addPanelLog('error', line)); });
  panelProcess.on('exit', (code) => { addPanelLog('info', `Panel zakończył się z kodem ${code}`); panelProcess = null; panelStartedAt = null; });
  res.json({ success: true });
});

app.post('/panel/stop', (req, res) => {
  if (!isPanelRunning()) return res.status(400).json({ error: 'Panel nie jest uruchomiony' });
  addPanelLog('info', 'Zatrzymywanie panelu');
  killProcess(panelProcess);
  panelProcess = null;
  panelStartedAt = null;
  res.json({ success: true });
});

app.post('/panel/restart', async (req, res) => {
  if (isPanelRunning()) {
    killProcess(panelProcess);
    let waited = 0;
    while (isPanelRunning() && waited < 5000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
  }
  addPanelLog('info', 'Restartowanie panelu...');
  panelProcess = spawn(npmCmd, ['run', 'dev'], { cwd: PANEL_DIR, detached: false, stdio: 'pipe', shell: true });
  panelStartedAt = Date.now();
  panelProcess.stdout.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addPanelLog('info', line)); });
  panelProcess.stderr.on('data', (data) => { data.toString().trim().split('\n').forEach(line => addPanelLog('error', line)); });
  panelProcess.on('exit', (code) => { addPanelLog('info', `Panel zakończył się z kodem ${code}`); panelProcess = null; panelStartedAt = null; });
  res.json({ success: true });
});

app.get('/api/panel-logs', (req, res) => res.json(panelLogs));

// ---------- PROXY DO API BOTA ----------
const BOT_API = 'http://localhost:3001';
async function proxyToBot(req, res, endpoint, method = 'GET', body = null) {
  if (!isBotRunning()) return res.status(503).json({ error: 'Bot nie jest uruchomiony' });
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${BOT_API}${endpoint}`, options);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/api/bot-status', (req, res) => proxyToBot(req, res, '/bot/status'));
app.post('/api/commands/clear-local', (req, res) => proxyToBot(req, res, '/commands/clear-local', 'POST', req.body));
app.post('/api/commands/clear-global', (req, res) => proxyToBot(req, res, '/commands/clear-global', 'POST'));
app.post('/api/commands/register-local', (req, res) => proxyToBot(req, res, '/commands/register-local', 'POST', req.body));
app.post('/api/commands/register-global', (req, res) => proxyToBot(req, res, '/commands/register-global', 'POST'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🕹️ Panel zarządzania dostępny na http://localhost:${PORT}`));