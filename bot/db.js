const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ─── Środowisko ───────────────────────────────────────────────────────────────

const BOT_ENV = process.env.BOT_ENV || 'test';

if (!['main', 'test'].includes(BOT_ENV)) {
  console.error(`❌ Nieprawidłowa wartość BOT_ENV: "${BOT_ENV}". Dozwolone: "main", "test"`);
  process.exit(1);
}

// ─── Logger (ustawiany przez index.js po inicjalizacji) ───────────────────────

let _logger = null;

function setLogger(logger) {
  _logger = logger;
}

function dbLog(type, message) {
  if (_logger) {
    _logger.db(type, message);
  } else {
    console.log(`[DB] [${type.toUpperCase()}] ${message}`);
  }
}

// ─── Folder danych ────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Cache otwartych baz ──────────────────────────────────────────────────────

const dbCache = new Map();

// ─── Schematy tabel ───────────────────────────────────────────────────────────

const SCHEMAS = {
  config: `
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `,
  guild_config: `
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id          TEXT PRIMARY KEY,
      prefix            TEXT DEFAULT '!',
      language          TEXT DEFAULT 'pl',
      timezone          TEXT DEFAULT 'Europe/Warsaw',
      command_limit     INTEGER DEFAULT 10,
      auto_delete_cmds  INTEGER DEFAULT 0,
      response_delay    INTEGER DEFAULT 0,
      updated_at        TEXT DEFAULT (datetime('now'))
    );
  `,
  moderation_settings: `
    CREATE TABLE IF NOT EXISTS moderation_settings (
      guild_id            TEXT PRIMARY KEY,
      ban_type            TEXT DEFAULT 'discord',
      ban_role_id         TEXT,
      appeal_channel_id   TEXT,
      mod_log_channel     TEXT,
      auto_mod_enabled    INTEGER DEFAULT 0,
      block_links         INTEGER DEFAULT 0,
      block_invites       INTEGER DEFAULT 0,
      warn_threshold      INTEGER DEFAULT 3,
      mute_role_id        TEXT,
      command_permissions TEXT DEFAULT '{}',
      command_enabled     TEXT DEFAULT '{}',
      updated_at          TEXT DEFAULT (datetime('now'))
    );
  `,
  punishments: `
    CREATE TABLE IF NOT EXISTS punishments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      moderator_id  TEXT NOT NULL,
      type          TEXT NOT NULL CHECK(type IN ('warn','mute','ban','kick','unmute','unban')),
      ban_type      TEXT CHECK(ban_type IN ('discord','role')),
      reason        TEXT DEFAULT 'Brak powodu',
      duration      INTEGER,
      expires_at    TEXT,
      active        INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_punishments_guild ON punishments(guild_id);
    CREATE INDEX IF NOT EXISTS idx_punishments_user ON punishments(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_punishments_active ON punishments(guild_id, active);
  `,
  activities: `
    CREATE TABLE IF NOT EXISTS activities (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id        TEXT NOT NULL,
      date            TEXT NOT NULL,
      messages        INTEGER DEFAULT 0,
      members_joined  INTEGER DEFAULT 0,
      members_left    INTEGER DEFAULT 0,
      top_channels    TEXT DEFAULT '[]',
      top_users       TEXT DEFAULT '[]',
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activities_guild ON activities(guild_id, date);
  `,
  global_config: `
    CREATE TABLE IF NOT EXISTS global_config (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `,
  welcome_settings: `
    CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id   TEXT PRIMARY KEY,
      enabled    INTEGER DEFAULT 0,
      channel_id TEXT,
      message    TEXT DEFAULT 'Witaj {user} na serwerze {server}!',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `,
  role_groups: `
    CREATE TABLE IF NOT EXISTS role_groups (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id        TEXT NOT NULL,
      parent_role_id  TEXT NOT NULL,
      parent_role_name TEXT,
      mode            TEXT DEFAULT 'multiple' CHECK(mode IN ('single','multiple')),
      child_roles     TEXT DEFAULT '[]',
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_role_groups_guild ON role_groups(guild_id);
  `,
  tickets: `
    CREATE TABLE IF NOT EXISTS tickets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id   TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      channel_id TEXT,
      status     TEXT DEFAULT 'open' CHECK(status IN ('open','closed','resolved')),
      reason     TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id, status);
  `,
};

// ─── Otwórz bazę dla konkretnego guildId ──────────────────────────────────────

function getDb(guildId) {
  if (dbCache.has(guildId)) return dbCache.get(guildId);

  const dbPath = path.join(DATA_DIR, `${BOT_ENV}_${guildId}.db`);
  const db = new Database(dbPath);

  // Włącz WAL dla wydajności
  db.pragma('journal_mode = WAL');

  // Utwórz wszystkie tabele
  for (const [name, sql] of Object.entries(SCHEMAS)) {
    try {
      db.exec(sql);
      dbLog('debug', `[${guildId}] tabela '${name}' gotowa`);
    } catch (err) {
      dbLog('error', `[${guildId}] błąd tworzenia tabeli '${name}': ${err.message}`);
    }
  }

  dbCache.set(guildId, db);
  dbLog('info', `[${guildId}] baza otwarta: ${BOT_ENV}_${guildId}.db`);
  return db;
}

// ─── Zamknij bazę ─────────────────────────────────────────────────────────────

function closeDb(guildId) {
  if (dbCache.has(guildId)) {
    try {
      dbCache.get(guildId).close();
      dbCache.delete(guildId);
      dbLog('info', `[${guildId}] baza zamknięta`);
    } catch (err) {
      dbLog('error', `[${guildId}] błąd zamykania bazy: ${err.message}`);
    }
  }
}

// ─── Połączenie (dla kompatybilności z index.js) ──────────────────────────────

async function connectDB() {
  dbLog('info', `SQLite gotowy [${BOT_ENV}], katalog: ${DATA_DIR}`);
  return true;
}

// ─── Inicjalizacja struktury (dla kompatybilności) ────────────────────────────

async function initDbStructure() {
  dbLog('info', `Struktura SQLite gotowa — tabele tworzone automatycznie przy pierwszym dostępie`);
  return true;
}

// ─── Eksplorator bazy — endpointy ─────────────────────────────────────────────

function setupDatabaseExplorer(app) {
  // Lista wszystkich baz (serwerów)
  app.get('/api/database/list', (req, res) => {
    try {
      const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.db'))
        .map(f => ({
          name: f.replace(/\.db$/, ''),
          path: f,
          size: fs.statSync(path.join(DATA_DIR, f)).size,
        }));
      res.json({ success: true, databases: files, env: BOT_ENV });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Lista tabel w bazie serwera
  app.get('/api/database/:guildId/tables', (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all();
      res.json({ success: true, tables: tables.map(t => t.name) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dane z tabeli
  app.get('/api/database/:guildId/:table', (req, res) => {
    try {
      const { guildId, table } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 500);
      const offset = parseInt(req.query.offset) || 0;

      const db = getDb(guildId);

      // Walidacja — tylko znane tabele
      const validTables = Object.keys(SCHEMAS);
      if (!validTables.includes(table)) {
        return res.status(400).json({ error: `Nieznana tabela: ${table}. Dozwolone: ${validTables.join(', ')}` });
      }

      const rows = db.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(limit, offset);
      const count = db.prepare(`SELECT COUNT(*) as total FROM "${table}"`).get();

      // Pobierz info o kolumnach
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all();

      res.json({
        success: true,
        table,
        columns: columns.map(c => ({ name: c.name, type: c.type })),
        rows,
        total: count.total,
        limit,
        offset,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Wykonaj własne zapytanie SQL (tylko SELECT)
  app.post('/api/database/query', (req, res) => {
    try {
      const { guildId, sql } = req.body;
      if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
        return res.status(400).json({ error: 'Dozwolone tylko SELECT' });
      }
      const db = getDb(guildId);
      const rows = db.prepare(sql).all();
      res.json({ success: true, rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ─── Eksport ──────────────────────────────────────────────────────────────────

module.exports = {
  BOT_ENV,
  setLogger,
  connectDB,
  initDbStructure,
  getDb,
  closeDb,
  setupDatabaseExplorer,
  dbLog,
};
