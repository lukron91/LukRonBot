require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));

// ---------- STATUS BOTA (zapis do pliku) ----------
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

// ---------- MONGODB ----------
let dbConnected = false;
let Guild = null;
const memoryConfigs = new Map();

async function initMongo() {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️ Brak MONGODB_URI – używam pamięci tymczasowej');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected');
    const guildSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      prefix: { type: String, default: '!' },
      language: { type: String, default: 'pl' },
      timezone: { type: String, default: 'Europe/Warsaw' },
      autoModEnabled: { type: Boolean, default: false },
      blockLinks: { type: Boolean, default: false },
      blockInvites: { type: Boolean, default: false },
      welcomeEnabled: { type: Boolean, default: false },
      logEnabled: { type: Boolean, default: false },
      warnThreshold: { type: Number, default: 3 },
      banMethod: { type: String, default: 'discord' },
      banRoleId: { type: String, default: null },
      modLogChannel: { type: String, default: null },
    });
    Guild = mongoose.model('Guild', guildSchema);
  } catch (err) {
    console.error('❌ MongoDB error:', err);
    dbConnected = false;
  }
}
initMongo();

async function getConfig(guildId) {
  if (dbConnected && Guild) {
    try {
      let config = await Guild.findOne({ guildId });
      if (!config) {
        config = new Guild({ guildId });
        await config.save();
      }
      return config.toObject();
    } catch (err) { console.error('Błąd odczytu konfiguracji:', err); }
  }
  if (!memoryConfigs.has(guildId)) {
    memoryConfigs.set(guildId, {
      guildId, prefix: '!', language: 'pl', timezone: 'Europe/Warsaw',
      autoModEnabled: false, blockLinks: false, blockInvites: false,
      welcomeEnabled: false, logEnabled: false, warnThreshold: 3,
      banMethod: 'discord', banRoleId: null, modLogChannel: null,
    });
  }
  return memoryConfigs.get(guildId);
}

async function setConfig(guildId, update) {
  if (dbConnected && Guild) {
    try {
      const config = await Guild.findOneAndUpdate(
        { guildId }, { ...update, guildId }, { upsert: true, new: true }
      );
      return config.toObject();
    } catch (err) { console.error('Błąd zapisu konfiguracji:', err); throw err; }
  }
  const current = memoryConfigs.get(guildId) || { guildId };
  const updated = { ...current, ...update };
  memoryConfigs.set(guildId, updated);
  return updated;
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
  const config = await getConfig(message.guild.id);
  const prefix = config.prefix || '!';
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (cmd === 'ping') message.reply('Pong!');
});

// ---------- API ENDPOINTY ----------
app.get('/api/status', (req, res) => res.json({ mongo: dbConnected }));
app.get('/api/guilds/:guildId/config', async (req, res) => {
  try { res.json(await getConfig(req.params.guildId)); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/guilds/:guildId/config', async (req, res) => {
  try { res.json(await setConfig(req.params.guildId, req.body)); } catch (err) { res.status(500).json({ error: err.message }); }
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
app.get('/api/guilds/:guildId/roles', async (req, res) => {
  const { guildId } = req.params;
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
    const roles = guild.roles.cache.filter(r => r.id !== guild.id && r.name !== '@everyone').map(r => ({ id: r.id, name: r.name }));
    res.json(roles);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/guilds/:guildId/channels', async (req, res) => {
  const { guildId } = req.params;
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
    const channels = guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name, type: c.type }));
    res.json(channels);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/guilds/:guildId/config/moderation', async (req, res) => {
  const { guildId } = req.params;
  const updates = req.body;
  try {
    const config = await setConfig(guildId, updates);
    res.json(config);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ---------- SYSTEM MODUŁÓW (dodawanie w locie, usuwanie wymaga restartu) ----------
const modulesPath = path.join(__dirname, 'modules');
let loadedModules = new Map();

function registerModule(moduleName, required = false, description = '') {
  loadedModules.set(moduleName, { enabled: true, required, description });
  console.log(`[modules] ${moduleName} zarejestrowany (${required ? 'wymagany' : 'opcjonalny'})`);
}

function unregisterModule(moduleName) {
  loadedModules.delete(moduleName);
  console.log(`[modules] ${moduleName} odrejestrowany (wymaga restartu, aby całkowicie usunąć trasę)`);
}

function loadAllModules() {
  if (!fs.existsSync(modulesPath)) {
    console.log('⚠️ Folder modules nie istnieje');
    return;
  }
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
  for (const file of moduleFiles) {
    const moduleName = file.replace(/\.js$/, '');
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
  if (!fs.existsSync(modulesPath)) {
    return { added: [], removed: [] };
  }
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
  const newModules = [];
  for (const file of moduleFiles) {
    const moduleName = file.replace(/\.js$/, '');
    if (!loadedModules.has(moduleName)) {
      try {
        delete require.cache[require.resolve(path.join(modulesPath, file))];
        const moduleFn = require(path.join(modulesPath, file));
        if (typeof moduleFn === 'function') {
          moduleFn(app, client, registerModule, unregisterModule, moduleName);
          newModules.push(moduleName);
          console.log(`✅ Nowy moduł dodany: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Błąd ładowania nowego modułu ${file}:`, err.message);
      }
    }
  }
  const removedModules = Array.from(loadedModules.keys()).filter(name => !moduleFiles.includes(name + '.js'));
  if (removedModules.length) {
    console.log(`⚠️ Moduły usunięte z dysku (wymagają restartu bota): ${removedModules.join(', ')}`);
  }
  return { added: newModules, removed: removedModules };
}

loadAllModules();

app.post('/api/modules/reload', (req, res) => {
  const { added, removed } = reloadModules();
  res.json({
    success: true,
    added,
    removed,
    message: `Dodano ${added.length} nowych modułów. Usunięte moduły (${removed.length}) wymagają restartu bota.`
  });
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