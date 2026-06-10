require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const { WebSocketServer } = require('ws');
const { connectDB, initDbStructure, setLogger, setupDatabaseExplorer, BOT_ENV } = require('./db');

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));

// ─── Logger ───────────────────────────────────────────────────────────────────
// Musi być zainicjalizowany przed modułami — każdy moduł korzysta z app.locals.logger

{
  const LOG_DIR          = path.join(__dirname, 'logs');
  const SYSTEM_LOG_FILE  = path.join(LOG_DIR, 'system.log');
  const ACTIVITY_LOG_FILE = path.join(LOG_DIR, 'activity.log');
  const DB_LOG_FILE      = path.join(LOG_DIR, 'db.log');
  const MAX_LOGS = 1000;

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  function readLogsFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) return [];
      const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
      return lines.slice(-MAX_LOGS).map(line => {
        const m = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+)$/);
        if (m) return { timestamp: m[1], type: m[2].toLowerCase(), source: m[3], message: m[4] };
        return { timestamp: new Date().toISOString(), type: 'info', source: 'core', message: line };
      }).reverse();
    } catch { return []; }
  }

  let systemLogs   = readLogsFromFile(SYSTEM_LOG_FILE);
  let activityLogs = readLogsFromFile(ACTIVITY_LOG_FILE);
  let dbLogs       = readLogsFromFile(DB_LOG_FILE);

  function writeLog(type, message, category, source = 'core') {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, type, source, message };
    let logFile, logsArray;
    if (category === 'system')   { logFile = SYSTEM_LOG_FILE;   logsArray = systemLogs; }
    if (category === 'activity') { logFile = ACTIVITY_LOG_FILE; logsArray = activityLogs; }
    if (category === 'db')       { logFile = DB_LOG_FILE;       logsArray = dbLogs; }
    if (logsArray) {
      logsArray.unshift(entry);
      if (logsArray.length > MAX_LOGS) logsArray.pop();
      fs.appendFile(logFile, `[${timestamp}] [${type.toUpperCase()}] [${source}] ${message}\n`, () => {});
    }
    const colors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[37m' };
    const c = colors[type] || '\x1b[90m';
    process.stdout.write(`${c}[${timestamp}] [${type.toUpperCase()}] [${category}] [${source}] ${message}\x1b[0m\n`);
  }

  const logger = {
    system:   (type, msg, src = 'core') => writeLog(type, msg, 'system', src),
    activity: (type, msg, src = 'core') => writeLog(type, msg, 'activity', src),
    db:       (type, msg, src = 'db')   => writeLog(type, msg, 'db', src),
    info:     (msg, src = 'core')       => writeLog('info',  msg, 'activity', src),
    warn:     (msg, src = 'core')       => writeLog('warn',  msg, 'activity', src),
    error:    (msg, src = 'core')       => writeLog('error', msg, 'activity', src),
  };

  app.locals.logger = logger;

  // Przekaż logger do db.js — od tej chwili wszystkie operacje na bazie są logowane
  setLogger(logger);

  // Endpointy logów — tu bo logger jest lokalny dla tego bloku
  app.get('/api/logs/system',   (req, res) => res.json(systemLogs));
  app.get('/api/logs/activity', (req, res) => res.json(activityLogs));
  app.get('/api/logs/db',       (req, res) => res.json(dbLogs));
}

// ─── Discord Client ───────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── System modułów ───────────────────────────────────────────────────────────

const modulesPath   = path.join(__dirname, 'modules');
const loadedModules = new Map();

function registerModule(name, required = false, description = '') {
  loadedModules.set(name, { enabled: true, required, description });
  app.locals.logger.system('info', `Moduł zarejestrowany: ${name}`, 'modules');
}
function unregisterModule(name) {
  loadedModules.delete(name);
}

function loadAllModules() {
  if (!fs.existsSync(modulesPath)) return;
  const files = fs.readdirSync(modulesPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const name = file.replace(/\.js$/, '');
    try {
      const fn = require(path.join(modulesPath, file));
      if (typeof fn === 'function') fn(app, client, registerModule, unregisterModule, name);
    } catch (err) {
      app.locals.logger.system('error', `Błąd ładowania modułu ${file}: ${err.message}`, 'modules');
    }
  }
}

// Endpointy modułów
app.get('/api/modules', (req, res) => {
  res.json({
    modules: Array.from(loadedModules.entries()).map(([name, data]) => ({
      name,
      status: data.enabled ? 'active' : 'disabled',
      required: data.required,
      description: data.description || 'Brak opisu',
    })),
  });
});

app.post('/api/modules/reload', (req, res) => {
  if (!fs.existsSync(modulesPath)) return res.json({ success: true, added: [], removed: [] });
  const files = fs.readdirSync(modulesPath).filter(f => f.endsWith('.js'));
  const added = [];
  for (const file of files) {
    const name = file.replace(/\.js$/, '');
    if (!loadedModules.has(name)) {
      try {
        delete require.cache[require.resolve(path.join(modulesPath, file))];
        const fn = require(path.join(modulesPath, file));
        if (typeof fn === 'function') { fn(app, client, registerModule, unregisterModule, name); added.push(name); }
      } catch (err) {
        app.locals.logger.system('error', `Błąd reload ${file}: ${err.message}`, 'modules');
      }
    }
  }
  const removed = Array.from(loadedModules.keys()).filter(n => !files.includes(n + '.js'));
  res.json({ success: true, added, removed });
});

// ─── Podstawowe endpointy ─────────────────────────────────────────────────────

// Status połączenia z bazą i środowisko — używane przez panel
app.get('/api/status', (req, res) => {
  res.json({ db: app.locals.isDbConnected(), env: BOT_ENV });
});

// Lista serwerów na których jest bot — używana przez panel do listy serwerów
app.get('/api/guilds', (req, res) => {
  const guilds = client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    memberCount: g.memberCount,
  }));
  res.json({ success: true, guilds });
});

// Statystyki serwera Discord — używane przez panel (lista serwerów i dashboard)
const statsCache = new Map();
setInterval(() => statsCache.clear(), 30000);

app.get('/api/guilds/:guildId/stats', (req, res) => {
  const { guildId } = req.params;
  if (statsCache.has(guildId)) return res.json(statsCache.get(guildId));
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
  const stats = {
    members:  guild.memberCount,
    channels: guild.channels.cache.size,
    roles:    guild.roles.cache.size,
  };
  statsCache.set(guildId, stats);
  res.json(stats);
});

// ─── WebSocket ────────────────────────────────────────────────────────────────

function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  app.locals.wss = wss;

  const broadcast = (guildId, payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach(ws => {
      if (ws.readyState === ws.OPEN && ws.guildId === guildId) ws.send(msg);
    });
  };

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    ws.guildId = url.searchParams.get('guildId');
    ws.on('error', () => {});
  });

  // Eventy Discord → broadcast do panelu
  client.on('roleCreate',        role => broadcast(role.guild.id, { type: 'roleCreate',        roleId: role.id }));
  client.on('roleUpdate',        (_, r) => broadcast(r.guild.id,  { type: 'roleUpdate',         roleId: r.id  }));
  client.on('roleDelete',        role => broadcast(role.guild.id, { type: 'roleDelete',         roleId: role.id }));
  client.on('guildMemberUpdate', (_, m) => broadcast(m.guild.id,  { type: 'guildMemberUpdate',  userId: m.id  }));

  app.locals.logger.system('info', 'WebSocket server aktywny na /ws', 'core');
}

// ─── Sekwencja startowa ───────────────────────────────────────────────────────

async function startBot() {
  const logger = app.locals.logger;
  logger.system('info', `🚀 Start bota [środowisko: ${BOT_ENV}]`, 'core');

  // 1. Baza danych
  const dbConnected = await connectDB();
  app.locals.isDbConnected = () => dbConnected;

  if (dbConnected) {
    await initDbStructure();
  } else {
    logger.system('warn', 'Bot startuje bez bazy danych — funkcje wymagające bazy nie będą działać', 'core');
  }

  // 2. Moduły (ładowane po bazie żeby mogły zakładać modele)
  loadAllModules();
  logger.system('info', `Załadowano ${loadedModules.size} modułów`, 'modules');

  // 3. Eksplorator bazy (endpointy API do podglądu baz SQLite)
  setupDatabaseExplorer(app);

  // 4. Discord
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    logger.system('info', `Discord: zalogowano jako ${client.user?.tag}`, 'core');
  } catch (err) {
    logger.system('error', `Discord: błąd logowania — ${err.message}`, 'core');
  }

  // 5. HTTP + WebSocket
  const PORT = process.env.API_PORT || 3001;
  const httpServer = http.createServer(app);
  setupWebSocket(httpServer);
  httpServer.listen(PORT, () => {
    logger.system('info', `API nasłuchuje na porcie ${PORT}`, 'core');
  });
}

startBot();
