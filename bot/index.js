require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { connectDB, col, getActiveEnv } = require('./db');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));

const activeDatabase = getActiveEnv();
let dbConnected = false;

// =============================================================================
// SYSTEM LOGOWANIA (Szybki, Asynchroniczny, Kategoryzowany)
// =============================================================================
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, 'logs');
    this.files = {
      system: path.join(this.logDir, 'system.log'),
      activity: path.join(this.logDir, 'activity.log'),
      db: path.join(this.logDir, 'db.log'),
    };
    this.maxLines = 2000;
    this._ensureLogDir();
  }

  async _ensureLogDir() {
    try {
      if (!fsSync.existsSync(this.logDir)) {
        await fs.mkdir(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error('❌ Błąd tworzenia folderu logów:', err);
    }
  }

  async _write(category, type, message, source = 'core') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${type.toUpperCase()}] [${source}] ${message}\n`;
    
    try {
      const filePath = this.files[category] || this.files.system;
      await fs.appendFile(filePath, logLine, 'utf8');
      
      // Kolorowanie w konsoli
      let color = '\x1b[37m'; // white
      if (type === 'error') color = '\x1b[31m'; // red
      else if (type === 'warn') color = '\x1b[33m'; // yellow
      else if (type === 'info') color = '\x1b[32m'; // green
      process.stdout.write(`${color}[${timestamp}] [${type.toUpperCase()}] [${category}] ${message}\x1b[0m\n`);
    } catch (err) {
      console.error('❌ Błąd zapisu logu:', err);
    }
  }

  system(type, msg, src) { this._write('system', type, msg, src); }
  activity(type, msg, src) { this._write('activity', type, msg, src); }
  db(type, msg, src) { this._write('db', type, msg, src); }
  info(msg, src) { this._write('activity', 'info', msg, src); }
  warn(msg, src) { this._write('activity', 'warn', msg, src); }
  error(msg, src) { this._write('activity', 'error', msg, src); }

  async readLogs(category) {
    try {
      const filePath = this.files[category] || this.files.system;
      if (!fsSync.existsSync(filePath)) return [];
      const data = await fs.readFile(filePath, 'utf8');
      const lines = data.trim().split('\n').filter(Boolean);
      return lines.slice(-this.maxLines).map(line => {
        const match = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+)$/);
        if (match) return { timestamp: match[1], type: match[2].toLowerCase(), source: match[3], message: match[4] };
        return { timestamp: new Date().toISOString(), type: 'info', source: 'core', message: line };
      }).reverse();
    } catch (e) {
      return [];
    }
  }
}

const logger = new Logger();
app.locals.logger = logger;

// =============================================================================
// INICJALIZACJA STRUKTURY BAZY (Wizja Pro)
// =============================================================================
async function initDbStructure() {
  try {
    // 1. Global Configs (Klucz-Wartość)
    const GlobalConfigSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed },
      updatedAt: { type: Date, default: Date.now }
    });
    const GlobalConfig = mongoose.models.globalconfigs || mongoose.model('globalconfigs', GlobalConfigSchema, col('globalconfigs'));

    // Podstawowe ustawienia systemowe
    const systemDefaults = [
      { key: 'active_env', value: activeDatabase },
      { key: 'bot_status', value: 'online' },
      { key: 'custom_status', value: 'Pracuję nad nową wersją!' },
      { key: 'version', value: '2.0.0-beta' }
    ];

    for (const def of systemDefaults) {
      await GlobalConfig.findOneAndUpdate({ key: def.key }, { ...def, updatedAt: new Date() }, { upsert: true });
    }

    // 2. Guild Configs (Ustawienia serwerów)
    const GuildConfigSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      prefix: { type: String, default: '!' },
      welcome: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        message: { type: String, default: 'Witaj na serwerze!' }
      },
      moderation: {
        banType: { type: String, default: 'discord', enum: ['discord', 'role'] },
        banRoleId: String,
        appealChannelId: String,
        autoModEnabled: { type: Boolean, default: false }
      },
      logs: {
        modLogChannel: String,
        memberLogChannel: String,
        msgLogChannel: String
      },
      updatedAt: { type: Date, default: Date.now }
    });
    mongoose.models.guildconfigs || mongoose.model('guildconfigs', GuildConfigSchema, col('guildconfigs'));

    // 3. Activities (Optymalizacja trendów)
    const ActivitySchema = new mongoose.Schema({
      guildId: { type: String, required: true },
      date: { type: Date, required: true },
      messages: { type: Number, default: 0 },
      membersJoined: { type: Number, default: 0 },
      membersLeft: { type: Number, default: 0 },
      topChannels: [{ channelId: String, channelName: String, count: Number }],
      topUsers: [{ userId: String, username: String, avatar: String, count: Number }]
    }, { timestamps: true });
    
    // KLUCZOWY INDEKS dla szybkości zapytania o trendy (7 dni)
    const Activity = mongoose.models.activities || mongoose.model('activities', ActivitySchema, col('activities'));
    await Activity.collection.createIndex({ guildId: 1, date: 1 });

    logger.db('info', `Struktura bazy zainicjalizowana pomyślnie (Środowisko: ${activeDatabase})`, 'init');
  } catch (err) {
    logger.db('error', `Błąd inicjalizacji struktury: ${err.message}`, 'init');
    throw err;
  }
}

// =============================================================================
// CORE BOT & API
// =============================================================================
let dbConnected = false;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

// Endpointy API
app.get('/api/bot/health', (req, res) => {
  const uptime = Math.floor((Date.now() - (process.uptime() * 1000)) / 1000); // simplified
  res.json({
    running: true,
    ping: client.ws ? Math.round(client.ws.ping) : 0,
    uptime: uptime,
    guilds: client.guilds.cache.size,
    cpu: process.cpuUsage().user / 1000000, 
    ram: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    status: client.user?.presence?.status || 'online',
    dbConnected: dbConnected
  });
});

app.get('/api/status', (req, res) => res.json({ mongo: dbConnected }));

app.get('/api/database/status', (req, res) => {
  res.json({ activeDatabase, dbConnected });
});

// Logi API
app.get('/api/logs/system', async (req, res) => res.json(await logger.readLogs('system')));
app.get('/api/logs/activity', async (req, res) => res.json(await logger.readLogs('activity')));
app.get('/api/logs/db', async (req, res) => res.json(await logger.readLogs('db')));

// Stats API
app.get('/api/guilds/:guildId/stats', (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
  res.json({ members: guild.memberCount, channels: guild.channels.cache.size, roles: guild.roles.cache.size });
});

// MODUŁY
const modulesPath = path.join(__dirname, 'modules');
let loadedModules = new Map();

function loadAllModules() {
  if (!fsSync.existsSync(modulesPath)) return;
  const files = fsSync.readdirSync(modulesPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const name = file.replace('.js', '');
    try {
      const mod = require(path.join(modulesPath, file));
      if (typeof mod === 'function') {
        mod(app, client, (n, r, d) => loadedModules.set(n, {enabled: true, required: r, description: d}), (n) => loadedModules.delete(n), name);
      }
    } catch (e) { console.error(`❌ Moduł ${file} błąd:`, e.message); }
  }
}

app.get('/api/modules', (req, res) => {
  res.json({ modules: Array.from(loadedModules.entries()).map(([n, d]) => ({ name: n, status: d.enabled ? 'active' : 'disabled', description: d.description })) });
});

app.post('/api/modules/reload', (req, res) => {
  // Minimalistyczny reload
  res.json({ success: true, added: [], removed: [] });
});

// STARTUP SEQUENCE
async function start() {
  console.log('🚀 Start systemu LukRonBot...');
  
  // 1. Baza
  dbConnected = await connectDB();
  if (dbConnected) {
    await initDbStructure();
  } else {
    logger.system('error', 'Start bota bez bazy danych!', 'core');
  }

  // 2. Moduły
  loadAllModules();

  // 3. Discord
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('✅ Discord OK');
  } catch (e) {
    console.error('❌ Discord Token Error:', e.message);
  }

  // 4. Express
  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => console.log(`🌐 Bot API on http://localhost:${PORT}`));
}

start();
