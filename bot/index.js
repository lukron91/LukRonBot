require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { connectDB, col, getActiveEnv } = require('./db');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));

const activeDatabase = getActiveEnv();
let dbConnected = false;

// ---------- INICJALIZACJA STRUKTURY BAZY ----------
async function initDbStructure() {
  try {
    // ── 1. globalconfigs — ustawienia systemowe klucz-wartość ──────────────
    const GlobalConfigSchema = new mongoose.Schema({
      key:       { type: String, required: true, unique: true },
      value:     { type: mongoose.Schema.Types.Mixed },
      updatedAt: { type: Date, default: Date.now }
    });
    const GlobalConfig = mongoose.models[col('globalconfigs')]
      || mongoose.model(col('globalconfigs'), GlobalConfigSchema, col('globalconfigs'));

    const systemDefaults = [
      { key: 'active_env',    value: activeDatabase },
      { key: 'bot_status',    value: 'online' },
      { key: 'custom_status', value: '' },
      { key: 'version',       value: '2.0.0-beta' },
    ];
    for (const def of systemDefaults) {
      await GlobalConfig.findOneAndUpdate(
        { key: def.key },
        { ...def, updatedAt: new Date() },
        { upsert: true }
      );
    }

    // ── 2. guildconfigs — ustawienia per serwer Discord ────────────────────
    const GuildConfigSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      prefix:  { type: String, default: '!' },
      language: { type: String, default: 'pl' },
      timezone: { type: String, default: 'Europe/Warsaw' },
      commandLimit:       { type: Number, default: 10 },
      autoDeleteCommands: { type: Boolean, default: false },
      responseDelay:      { type: Number, default: 0 },
      welcome: {
        enabled:   { type: Boolean, default: false },
        channelId: String,
        message:   { type: String, default: 'Witaj na serwerze!' }
      },
      moderation: {
        banType:          { type: String, default: 'discord', enum: ['discord', 'role'] },
        banRoleId:        String,
        appealChannelId:  String,
        autoModEnabled:   { type: Boolean, default: false },
        blockLinks:       { type: Boolean, default: false },
        blockInvites:     { type: Boolean, default: false },
        warnThreshold:    { type: Number, default: 3 },
        muteRoleId:       String,
      },
      logs: {
        modLogChannel:    String,
        memberLogChannel: String,
        msgLogChannel:    String,
      },
      updatedAt: { type: Date, default: Date.now }
    });
    mongoose.models[col('guildconfigs')]
      || mongoose.model(col('guildconfigs'), GuildConfigSchema, col('guildconfigs'));

    // ── 3. activities — trendy aktywności (agregowane per dzień) ───────────
    const ActivitySchema = new mongoose.Schema({
      guildId:       { type: String, required: true },
      date:          { type: Date,   required: true },
      messages:      { type: Number, default: 0 },
      membersJoined: { type: Number, default: 0 },
      membersLeft:   { type: Number, default: 0 },
      topChannels:   [{ channelId: String, channelName: String, count: Number }],
      topUsers:      [{ userId: String, username: String, avatar: String, count: Number }],
    }, { timestamps: true });

    const Activity = mongoose.models[col('activities')]
      || mongoose.model(col('activities'), ActivitySchema, col('activities'));
    await Activity.collection.createIndex({ guildId: 1, date: 1 });

    // ── 4. moderation — historia wszystkich kar ─────────────────────────────
    const ModerationSchema = new mongoose.Schema({
      guildId:     { type: String, required: true },
      userId:      { type: String, required: true },
      moderatorId: { type: String, required: true },
      type:        { type: String, required: true, enum: ['warn', 'mute', 'ban', 'kick', 'unmute', 'unban'] },
      banType:     { type: String, enum: ['discord', 'role'] }, // tylko dla ban/unban
      reason:      { type: String, default: 'Brak powodu' },
      duration:    Number,   // minuty (tylko mute)
      expiresAt:   Date,     // (tylko mute)
      active:      { type: Boolean, default: true },
    }, { timestamps: true });

    const Moderation = mongoose.models[col('moderation')]
      || mongoose.model(col('moderation'), ModerationSchema, col('moderation'));
    await Moderation.collection.createIndex({ guildId: 1, userId: 1 });
    await Moderation.collection.createIndex({ guildId: 1, type: 1 });

    // ── 5. tickets — system ticketów (przyszły) ─────────────────────────────
    const TicketSchema = new mongoose.Schema({
      guildId:   { type: String, required: true },
      userId:    { type: String, required: true },
      channelId: String,
      status:    { type: String, default: 'open', enum: ['open', 'closed', 'resolved'] },
      reason:    String,
    }, { timestamps: true });

    mongoose.models[col('tickets')]
      || mongoose.model(col('tickets'), TicketSchema, col('tickets'));

    // ── 6. role_groups — hierarchia ról (parent/child) ─────────────────────
    const RoleGroupSchema = new mongoose.Schema({
      guildId:        { type: String, required: true },
      parentRoleId:   { type: String, required: true },
      parentRoleName: String,
      mode:           { type: String, default: 'multiple', enum: ['single', 'multiple'] },
      childRoles:     [{ roleId: String, roleName: String }],
    }, { timestamps: true });

    mongoose.models[col('role_groups')]
      || mongoose.model(col('role_groups'), RoleGroupSchema, col('role_groups'));

    logger.db('info', `Struktura bazy zainicjalizowana (środowisko: ${activeDatabase})`, 'init');
    logger.db('info', `Kolekcje: ${['globalconfigs','guildconfigs','activities','moderation','tickets','role_groups'].map(c => col(c)).join(', ')}`, 'init');

  } catch (err) {
    logger.db('error', `Błąd inicjalizacji struktury: ${err.message}`, 'init');
    throw err;
  }
}

// ---------- STATUS BOTA ----------
const STATUS_FILE = path.join(__dirname, 'status.json');
function saveBotStatus(status, customStatus) {
  const data = { status, customStatus: customStatus || '' };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
}
function loadBotStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      return { status: data.status || 'online', customStatus: data.customStatus || '' };
    }
  } catch (err) { console.error('Błąd odczytu statusu:', err); }
  return { status: 'online', customStatus: '' };
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  console.log(`🤖 Bot zalogowany jako ${client.user.tag}`);
  const { status, customStatus } = loadBotStatus();
  const presenceData = { status };
  if (customStatus && customStatus.trim() !== '') {
    presenceData.activities = [{ name: customStatus, type: ActivityType.Custom }];
  }
  try { await client.user.setPresence(presenceData); } catch (err) { console.error(err); }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const getGuildConfig = app.locals.getGuildConfig;
  if (!getGuildConfig) return;
  const config = await getGuildConfig(message.guild.id);
  const prefix = config.prefix || '!';
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (cmd === 'ping') message.reply('Pong!');
});

// ---------- API ENDPOINTY ----------
// Health endpoint moved to modules/health.js
app.get('/api/status', (req, res) => res.json({ mongo: dbConnected }));
app.get('/api/database/status', (req, res) => {
  res.json({ activeDatabase, environments: ['main', 'test'], dbConnected });
});

let statsCache = new Map();
setInterval(() => statsCache.clear(), 30000);
app.get('/api/guilds/:guildId/stats', (req, res) => {
  const { guildId } = req.params;
  if (statsCache.has(guildId)) return res.json(statsCache.get(guildId));
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
  const stats = { members: guild.memberCount, channels: guild.channels.cache.size, roles: guild.roles.cache.size };
  statsCache.set(guildId, stats);
  res.json(stats);
});

// LOGGER (Logika Claude'a)
{
  const LOG_DIR = path.join(__dirname, 'logs');
  const SYSTEM_LOG_FILE = path.join(LOG_DIR, 'system.log');
  const ACTIVITY_LOG_FILE = path.join(LOG_DIR, 'activity.log');
  const DB_LOG_FILE = path.join(LOG_DIR, 'db.log');
  const MAX_LOGS = 1000;
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  function readLogsFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) return [];
      const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
      return lines.slice(-MAX_LOGS).map(line => {
        const match = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+)$/);
        if (match) return { timestamp: match[1], type: match[2].toLowerCase(), source: match[3], message: match[4] };
        return { timestamp: new Date().toISOString(), type: 'info', source: 'core', message: line };
      }).reverse();
    } catch (e) { return []; }
  }
  let systemLogs = readLogsFromFile(SYSTEM_LOG_FILE);
  let activityLogs = readLogsFromFile(ACTIVITY_LOG_FILE);
  let dbLogs = readLogsFromFile(DB_LOG_FILE);
  function writeLog(type, message, category, source = 'core') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, source, message };
    let logFile, logsArray;
    if (category === 'system') { logFile = SYSTEM_LOG_FILE; logsArray = systemLogs; }
    else if (category === 'activity') { logFile = ACTIVITY_LOG_FILE; logsArray = activityLogs; }
    else if (category === 'db') { logFile = DB_LOG_FILE; logsArray = dbLogs; }
    if (logsArray) {
      logsArray.unshift(logEntry);
      if (logsArray.length > MAX_LOGS) logsArray.pop();
      fs.appendFile(logFile, `[${timestamp}] [${type.toUpperCase()}] [${source}] ${message}\n`, () => {});
    }
    let color = type === 'error' ? '\x1b[31m' : type === 'warn' ? '\x1b[33m' : type === 'info' ? '\x1b[37m' : '\x1b[90m';
    process.stdout.write(`${color}[${timestamp}] [${type.toUpperCase()}] [${category}] [${source}] ${message}\x1b[0m\n`);
  }
  const logger = {
    system: (type, message, source = 'core') => writeLog(type, message, 'system', source),
    activity: (type, message, source = 'core') => writeLog(type, message, 'activity', source),
    db: (type, message, source = 'db') => writeLog(type, message, 'db', source),
    info: (msg, source = 'core') => writeLog('info', msg, 'activity', source),
    warn: (msg, source = 'core') => writeLog('warn', msg, 'activity', source),
    error: (msg, source = 'core') => writeLog('error', msg, 'activity', source),
    debug: (msg, source = 'core') => writeLog('debug', msg, 'activity', source),
  };
  app.locals.logger = logger;
  app.get('/api/logs/system', (req, res) => res.json(systemLogs));
  app.get('/api/logs/activity', (req, res) => res.json(activityLogs));
  app.get('/api/logs/db', (req, res) => res.json(dbLogs));
}

app.locals.activeDatabase = getActiveEnv;
app.locals.dbCollection = col;
app.locals.isDbConnected = () => dbConnected;

// SYSTEM MODUŁÓW
const modulesPath = path.join(__dirname, 'modules');
let loadedModules = new Map();
function registerModule(moduleName, required = false, description = '') {
  loadedModules.set(moduleName, { enabled: true, required, description });
  console.log(`[modules] ${moduleName} zarejestrowany`);
}
function unregisterModule(moduleName) { loadedModules.delete(moduleName); }
function loadAllModules() {
  if (!fs.existsSync(modulesPath)) return;
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
  for (const file of moduleFiles) {
    const moduleName = file.replace(/.js$/, '');
    try {
      const moduleFn = require(path.join(modulesPath, file));
      if (typeof moduleFn === 'function') moduleFn(app, client, registerModule, unregisterModule, moduleName);
    } catch (err) { console.error(`❌ Błąd modułu ${file}:`, err.message); }
  }
}

app.post('/api/modules/reload', (req, res) => {
  const moduleFiles = fs.existsSync(modulesPath) ? fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')) : [];
  const newModules = [];
  for (const file of moduleFiles) {
    const moduleName = file.replace(/.js$/, '');
    if (!loadedModules.has(moduleName)) {
      try {
        delete require.cache[require.resolve(path.join(modulesPath, file))];
        const moduleFn = require(path.join(modulesPath, file));
        if (typeof moduleFn === 'function') {
          moduleFn(app, client, registerModule, unregisterModule, moduleName);
          newModules.push(moduleName);
        }
      } catch (err) { console.error(`❌ Błąd reload ${file}:`, err.message); }
    }
  }
  const removedModules = Array.from(loadedModules.keys()).filter(name => !moduleFiles.includes(name + '.js'));
  res.json({ success: true, added: newModules, removed: removedModules });
});
app.get('/api/modules', (req, res) => {
  const modulesList = Array.from(loadedModules.entries()).map(([name, data]) => ({
    name, status: data.enabled ? 'active' : 'disabled', required: data.required, description: data.description || 'Brak opisu'
  }));
  res.json({ modules: modulesList });
});

// ---------- SEKWENCJA STARTOWA (Kluczowa poprawka) ----------
async function startBot() {
  console.log('🚀 Rozpoczynanie sekwencji startowej...');
  
  // 1. Połącz z bazą
  dbConnected = await connectDB();
  
  if (dbConnected) {
    // 2. Inicjalizuj struktury bazy
    await initDbStructure();
    
    // 3. Załaduj moduły (teraz baza jest gotowa!)
    loadAllModules();
    console.log('✅ Wszystkie moduły załadowane pomyślnie.');
  } else {
    console.error('⚠️ Bot startuje bez połączenia z bazą danych. Niektóre funkcje nie będą działać.');
    loadAllModules(); // Ładujemy moduły mimo wszystko, ale one muszą obsłużyć brak bazy
  }

  // 4. Zaloguj bota na Discordzie
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('✅ Discord OK');
  } catch (err) {
    console.error('❌ Token error:', err);
  }

  // 5. Uruchom HTTP + WebSocket na tym samym porcie
  const PORT = process.env.API_PORT || 3001;
  const httpServer = http.createServer(app);

  // ── WebSocket Server ──────────────────────────────────────────────────────
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  app.locals.wss = wss;

  // Broadcast do klientów obserwujących dany guildId
  const broadcast = (guildId, payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach(ws => {
      if (ws.readyState === ws.OPEN && ws.guildId === guildId) {
        ws.send(msg);
      }
    });
  };

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    ws.guildId = url.searchParams.get('guildId');
    ws.on('error', () => {}); // ignoruj błędy połączenia
  });

  // Discord eventy → WebSocket broadcast
  client.on('roleCreate',       role => broadcast(role.guild.id, { type: 'roleCreate',       roleId: role.id }));
  client.on('roleUpdate',       (_, r) => broadcast(r.guild.id, { type: 'roleUpdate',        roleId: r.id }));
  client.on('roleDelete',       role => broadcast(role.guild.id, { type: 'roleDelete',       roleId: role.id }));
  client.on('guildMemberUpdate',(_, m) => broadcast(m.guild.id, { type: 'guildMemberUpdate', userId: m.id }));

  console.log('🔌 WebSocket server aktywny na ścieżce /ws');
  // ─────────────────────────────────────────────────────────────────────────

  httpServer.listen(PORT, () => console.log(`🌐 Bot API on http://localhost:${PORT}`));
}

startBot();
