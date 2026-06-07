require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { connectDB, col, getActiveEnv } = require('./db');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));

// ---------- ŚRODOWISKO BAZY ----------
const activeDatabase = getActiveEnv();

// ---------- INICJALIZACJA STRUKTURY BAZY ----------
async function initDbStructure() {
  if (!dbConnected) return;

  const GlobalConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
    updatedAt: { type: Date, default: Date.now }
  });
  const GlobalConfig = mongoose.models.globalconfigs
    || mongoose.model('globalconfigs', GlobalConfigSchema, 'globalconfigs');

  await GlobalConfig.findOneAndUpdate(
    { key: 'active_env' },
    { key: 'active_env', value: activeDatabase, updatedAt: new Date() },
    { upsert: true }
  );
  await GlobalConfig.findOneAndUpdate(
    { key: 'bot_status' },
    { key: 'bot_status', value: 'online', updatedAt: new Date() },
    { upsert: true }
  );
  await GlobalConfig.findOneAndUpdate(
    { key: 'custom_status' },
    { key: 'custom_status', value: '', updatedAt: new Date() },
    { upsert: true }
  );

  for (const env of ['main', 'test']) {
    const EnvConfigSchema = new mongoose.Schema({
      key: String,
      value: mongoose.Schema.Types.Mixed,
      updatedAt: Date
    });
    const EnvConfig = mongoose.models[`${env}_config`]
      || mongoose.model(`${env}_config`, EnvConfigSchema, `${env}_config`);

    await EnvConfig.findOneAndUpdate(
      { key: '_init' },
      { key: '_init', value: true, updatedAt: new Date() },
      { upsert: true }
    );
  }

  console.log(`✅ Struktura bazy zainicjalizowana (środowisko aktywne: ${activeDatabase})`);
}

// ---------- POŁĄCZENIE Z BAZĄ ----------
let dbConnected = false;
connectDB().then(connected => {
  dbConnected = connected;
  if (connected) initDbStructure();
});

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

// ---------- DISCORD BOT ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
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
app.get('/api/status', (req, res) => res.json({ mongo: dbConnected }));

app.get('/api/database/status', (req, res) => {
  res.json({
    activeDatabase,
    environments: ['main', 'test'],
    dbConnected
  });
});

let statsCache = new Map();
setInterval(() => statsCache.clear(), 30000);

app.get('/api/guilds/:guildId/stats', (req, res) => {
  const { guildId } = req.params;
  if (statsCache.has(guildId)) return res.json(statsCache.get(guildId));
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
  const stats = {
    members: guild.memberCount,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
  };
  statsCache.set(guildId, stats);
  res.json(stats);
});

// ---------- LOGGER ----------
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
        if (match) {
          return { timestamp: match[1], type: match[2].toLowerCase(), source: match[3], message: match[4] };
        }
        return { timestamp: new Date().toISOString(), type: 'info', source: 'core', message: line };
      }).reverse();
    } catch (e) {
      return [];
    }
  }

  let systemLogs = readLogsFromFile(SYSTEM_LOG_FILE);
  let activityLogs = readLogsFromFile(ACTIVITY_LOG_FILE);
  let dbLogs = readLogsFromFile(DB_LOG_FILE);

  function writeLog(type, message, category, source = 'core') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, source, message };

    let logFile, logsArray;
    if (category === 'system') {
      logFile = SYSTEM_LOG_FILE;
      logsArray = systemLogs;
    } else if (category === 'activity') {
      logFile = ACTIVITY_LOG_FILE;
      logsArray = activityLogs;
    } else if (category === 'db') {
      logFile = DB_LOG_FILE;
      logsArray = dbLogs;
    }

    if (logsArray) {
      logsArray.unshift(logEntry);
      if (logsArray.length > MAX_LOGS) logsArray.pop();
      fs.appendFile(logFile, `[${timestamp}] [${type.toUpperCase()}] [${source}] ${message}\n`, () => {});
    }

    let color = '';
    if (type === 'error') color = '\x1b[31m';
    else if (type === 'warn') color = '\x1b[33m';
    else if (type === 'info') color = '\x1b[37m';
    else color = '\x1b[90m';
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

  logger.system('info', 'System logowania aktywny', 'logger');
}

// ---------- UDOSTĘPNIJ FUNKCJE BAZY DLA MODUŁÓW ----------
app.locals.activeDatabase = getActiveEnv;
app.locals.dbCollection = col;
app.locals.isDbConnected = () => dbConnected;

// ---------- SYSTEM MODUŁÓW ----------
const modulesPath = path.join(__dirname, 'modules');
let loadedModules = new Map();

function registerModule(moduleName, required = false, description = '') {
  loadedModules.set(moduleName, { enabled: true, required, description });
  console.log(`[modules] ${moduleName} zarejestrowany (${required ? 'wymagany' : 'opcjonalny'})`);
}

function unregisterModule(moduleName) {
  loadedModules.delete(moduleName);
  console.log(`[modules] ${moduleName} odrejestrowany`);
}

function loadAllModules() {
  if (!fs.existsSync(modulesPath)) {
    console.log('⚠️ Folder modules nie istnieje');
    return;
  }
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
  for (const file of moduleFiles) {
    const moduleName = file.replace(/.js$/, '');
    try {
      const moduleFn = require(path.join(modulesPath, file));
      if (typeof moduleFn === 'function') {
        moduleFn(app, client, registerModule, unregisterModule, moduleName);
        console.log(`✅ Moduł załadowany: ${file}`);
      } else {
        console.log(`⚠️ Plik ${file} nie eksportuje funkcji`);
      }
    } catch (err) {
      console.error(`❌ Błąd ładowania modułu ${file}:`, err.message);
    }
  }
}

function reloadModules() {
  if (!fs.existsSync(modulesPath)) return { added: [], removed: [] };
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
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
      } catch (err) {
        console.error(`❌ Błąd ładowania nowego modułu ${file}:`, err.message);
      }
    }
  }
  const removedModules = Array.from(loadedModules.keys()).filter(name => !moduleFiles.includes(name + '.js'));
  return { added: newModules, removed: removedModules };
}

app.post('/api/modules/reload', (req, res) => {
  const { added, removed } = reloadModules();
  res.json({ success: true, added, removed });
});

app.get('/api/modules', (req, res) => {
  const modulesList = Array.from(loadedModules.entries()).map(([name, data]) => ({
    name,
    status: data.enabled ? 'active' : 'disabled',
    required: data.required,
    description: data.description || 'Brak opisu'
  }));
  res.json({ modules: modulesList });
});

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('✅ Discord OK'))
  .catch(err => console.error('❌ Token error:', err));

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`🌐 Bot API on http://localhost:${PORT}`));