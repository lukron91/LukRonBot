const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3001;
let botProcess = null;
let botLogs = [];
const MAX_LOGS = 100;

function log(message) {
  const time = new Date().toLocaleTimeString();
  const entry = `[${time}] ${message}`;
  botLogs.push(entry);
  if (botLogs.length > MAX_LOGS) botLogs.shift();
  console.log(entry);
}

function startBot() {
  if (botProcess) return { success: false, message: 'Bot już działa!' };
  
  log('🚀 Uruchamianie bota...');
  botProcess = spawn('node', ['index.js'], { cwd: __dirname });

  botProcess.stdout.on('data', (data) => log(`🟢 ${data.toString().trim()}`));
  botProcess.stderr.on('data', (data) => log(`🔴 ${data.toString().trim()}`));
  
  botProcess.on('close', (code) => {
    log(`🛑 Bot zatrzymany (kod: ${code})`);
    botProcess = null;
  });

  return { success: true, message: 'Bot uruchamiany...' };
}

function stopBot() {
  if (!botProcess) return { success: false, message: 'Bot nie działa.' };
  
  log('⛔ Zatrzymywanie bota...');
  botProcess.kill();
  botProcess = null;
  return { success: true, message: 'Bot zatrzymany.' };
}

const server = http.createServer((req, res) => {
  // Obsługa pliku HTML
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'manager.html')));
    return;
  }

  // API: Status
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      running: botProcess !== null,
      logs: botLogs 
    }));
    return;
  }

  // API: Start
  if (req.url === '/api/start' && req.method === 'POST') {
    const result = startBot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // API: Stop
  if (req.url === '/api/stop' && req.method === 'POST') {
    const result = stopBot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // API: Register commands
  if (req.url === '/api/register-commands' && req.method === 'POST') {
    log('📝 Rejestrowanie komend...');
    
    const registerProcess = spawn('node', ['register-commands.js'], { cwd: __dirname });
    
    registerProcess.stdout.on('data', (data) => {
      log(`📝 ${data.toString().trim()}`);
    });
    
    registerProcess.stderr.on('data', (data) => {
      log(`❌ ${data.toString().trim()}`);
    });
    
    registerProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ Komendy zarejestrowane!');
      } else {
        log(`❌ Błąd rejestracji (kod: ${code})`);
      }
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Rejestracja rozpoczęta' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  log(`✅ Manager uruchomiony! Otwórz w przeglądarce: http://localhost:${PORT}`);
  console.log(`Aby zobaczyć panel, otwórz: http://localhost:${PORT}`);
});