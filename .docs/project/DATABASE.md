# Baza danych — Dokumentacja

## Technologia

**SQLite** przez `better-sqlite3` — osobna baza danych na każdy serwer Discord.

## Lokalizacja

Pliki `.db` znajdują się w `bot/data/`.

Nazewnictwo: `{BOT_ENV}_{guildId}.db`
- `test_1411465107476582432.db` — środowisko testowe
- `main_1411465107476582432.db` — produkcja

## Środowiska

Zmienna `BOT_ENV` w `.env`:
- `test` — prefiks `test_` (development)
- `main` — prefiks `main_` (produkcja)

## Połączenie

```js
const { getDb, closeDb, connectDB } = require('./db');

// Otwórz bazę dla serwera (automatycznie tworzy tabele)
const db = getDb('1411465107476582432');

// Zamknij bazę
closeDb('1411465107476582432');
```

## Schematy tabel

### `config`
Klucz-wartość dla globalnych ustawień bota.

```sql
CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

### `guild_config`
Konfiguracja serwera Discord.

```sql
CREATE TABLE guild_config (
  guild_id          TEXT PRIMARY KEY,
  prefix            TEXT DEFAULT '!',
  language          TEXT DEFAULT 'pl',
  timezone          TEXT DEFAULT 'Europe/Warsaw',
  command_limit     INTEGER DEFAULT 10,
  auto_delete_cmds  INTEGER DEFAULT 0,
  response_delay    INTEGER DEFAULT 0,
  updated_at        TEXT DEFAULT (datetime('now'))
);
```

### `moderation_settings`
Ustawienia systemu moderacji.

```sql
CREATE TABLE moderation_settings (
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
  protected_roles     TEXT DEFAULT '[]',
  ignored_channels    TEXT DEFAULT '[]',
  auto_action_enabled INTEGER DEFAULT 0,
  auto_warn_threshold INTEGER DEFAULT 3,
  auto_mute_threshold INTEGER DEFAULT 5,
  auto_kick_threshold INTEGER DEFAULT 7,
  auto_ban_threshold  INTEGER DEFAULT 10,
  public_info_enabled INTEGER DEFAULT 0,
  public_info_channel TEXT,
  updated_at          TEXT DEFAULT (datetime('now'))
);
```

### `punishments`
Historia kar na serwerze.

```sql
CREATE TABLE punishments (
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
```

Indeksy: `guild_id`, `(guild_id, user_id)`, `(guild_id, active)`

### `activities`
Statystyki aktywności (dzienne).

```sql
CREATE TABLE activities (
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
```

Indeks: `(guild_id, date)`

### `global_config`
Globalne ustawienia bota (status, custom status).

```sql
CREATE TABLE global_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### `welcome_settings`
Ustawienia systemu powitań.

```sql
CREATE TABLE welcome_settings (
  guild_id   TEXT PRIMARY KEY,
  enabled    INTEGER DEFAULT 0,
  channel_id TEXT,
  message    TEXT DEFAULT 'Witaj {user} na serwerze {server}!',
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### `role_groups`
Grupy ról hierarchicznych (parent-child).

```sql
CREATE TABLE role_groups (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id        TEXT NOT NULL,
  parent_role_id  TEXT NOT NULL,
  parent_role_name TEXT,
  mode            TEXT DEFAULT 'multiple' CHECK(mode IN ('single','multiple')),
  child_roles     TEXT DEFAULT '[]',
  created_at      TEXT DEFAULT (datetime('now'))
);
```

Indeks: `guild_id`

### `tickets`
System ticketów.

```sql
CREATE TABLE tickets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  channel_id TEXT,
  status     TEXT DEFAULT 'open' CHECK(status IN ('open','closed','resolved')),
  reason     TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Indeks: `(guild_id, status)`

## Eksplorator bazy

Endpointy REST do przeglądania bazy przez panel:

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/database/list` | Lista wszystkich baz |
| GET | `/api/database/:guildId/tables` | Lista tabel w bazie |
| GET | `/api/database/:guildId/:table` | Dane z tabeli (limit/offset) |
| POST | `/api/database/query` | Własne SELECT |

## Logger DB

Wszystkie operacje na bazie są logowane przez `dbLog()`:
```js
dbLog('info', 'Komunikat');
dbLog('error', 'Błąd');
dbLog('debug', 'Szczegół');
```

Logi trafiają do `bot/logs/db.log`.
