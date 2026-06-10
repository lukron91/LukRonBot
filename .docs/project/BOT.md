# Bot Discord — Dokumentacja

## Uruchomienie

```bash
cd bot
npm install
node index.js
```

## Zmienne środowiskowe

Plik `.env` w katalogu `bot/`:

```
DISCORD_BOT_TOKEN=xxx
BOT_ENV=test              # 'test' | 'main'
BOT_API_PORT=3001
```

## Struktura

```
bot/
├── index.js           # Serwer Express + Discord Client + WebSocket
├── db.js              # SQLite (better-sqlite3) — połączenie, schematy, eksplorator
├── package.json
├── commands/          # Slash Commands (pliki .js)
│   └── ping.js
├── modules/           # Moduły API (ładowane dynamicznie)
│   ├── activity.js    # Statystyki aktywności
│   ├── commands.js    # Zarządzanie komendami Slash
│   ├── config.js      # Konfiguracja serwerów
│   ├── debug.js       # Testowanie i debug
│   ├── health.js      # Health check i statystyki
│   ├── moderation.js  # System kar (warn/mute/ban/kick)
│   ├── roles.js       # Zarządzanie rolami (CRUD + WebSocket)
│   └── status.js      # Status bota (presence)
├── events/            # Eventy Discord (future)
├── data/              # Pliki SQLite (.db)
└── logs/              # Logi systemowe
    ├── system.log
    ├── activity.log
    └── db.log
```

## System modułów

Moduły są ładowane dynamicznie z `bot/modules/`. Każdy moduł to funkcja:

```js
module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Opis modułu');
  // ... endpointy Express, eventy Discord
};
```

- `registerModule(name, required, description)` — rejestruje moduł
- `unregisterModule(name)` — wyrejestrowuje
- Endpointy: `GET /api/modules`, `POST /api/modules/reload`

## Endpointy REST API

### Status i zdrowie
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/status` | Status bazy i środowisko |
| GET | `/api/bot/health` | Health check (ping, uptime, CPU, RAM) |

### Guilds (serwery)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/guilds` | Lista serwerów bota |
| GET | `/api/guilds/:id/stats` | Statystyki serwera |
| GET | `/api/guilds/:id/permissions/:userId` | Uprawnienia użytkownika |
| GET | `/api/guilds/:id/users/:userId` | Pełne dane użytkownika |

### Konfiguracja
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/guilds/:id/config` | Konfiguracja serwera |
| POST | `/api/guilds/:id/config` | Zapis konfiguracji |
| POST | `/api/guilds/:id/config/moderation` | Ustawienia moderacji |

### Moderacja
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/guilds/:id/moderation/warn` | Nadaj warna |
| POST | `/api/guilds/:id/moderation/mute` | Wyciszenie |
| POST | `/api/guilds/:id/moderation/ban` | Ban (discord/role) |
| POST | `/api/guilds/:id/moderation/kick` | Wyrzucenie |
| POST | `/api/guilds/:id/moderation/unmute` | Odciszenie |
| POST | `/api/guilds/:id/moderation/unban` | Odbanowanie |
| GET | `/api/guilds/:id/punishments/:userId` | Historia kar |
| GET | `/api/guilds/:id/punishments/:userId/active` | Aktywne kary |
| DELETE | `/api/guilds/:id/punishments/warn/:warnId` | Usuń warna |

### Role
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/guilds/:id/roles/detailed` | Lista ról z detalami |
| POST | `/api/guilds/:id/roles` | Utwórz rolę |
| PATCH | `/api/guilds/:id/roles/:roleId` | Edytuj rolę |
| DELETE | `/api/guilds/:id/roles/:roleId` | Usuń rolę |
| POST | `/api/guilds/:id/roles/:roleId/copy` | Kopiuj rolę |
| POST | `/api/guilds/:id/roles/:roleId/move` | Przesuń rolę |
| GET | `/api/guilds/:id/roles/:roleId/members` | Członkowie roli |
| POST | `/api/guilds/:id/roles/:roleId/members/:userId` | Nadaj/odbierz rolę |

### Komendy
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/commands` | Lista komend w pamięci |
| GET | `/api/commands/registered-global` | Komendy globalne Discord |
| GET | `/api/commands/registered-guild/:id` | Komendy serwera |
| POST | `/api/commands/register` | Rejestracja komend |
| DELETE | `/api/commands/unregister` | Wyrejestrowanie |

### Aktywność
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/guilds/:id/activity/joined-today` | Dołączenia dzisiaj |
| GET | `/api/guilds/:id/activity/left-today` | Opuszczenia dzisiaj |
| GET | `/api/guilds/:id/activity/active-7days` | Aktywni w 7 dni |
| GET | `/api/guilds/:id/activity/trend` | Trend aktywności |
| GET | `/api/guilds/:id/activity/top-channels` | Najaktywniejsi kanały |
| GET | `/api/guilds/:id/activity/top-users` | Najaktywniejsi użytkownicy |

### Status bota
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/bot/status` | Zmiana statusu (online/idle/dnd/invisible) |

### Baza danych (eksplorator)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/database/list` | Lista baz SQLite |
| GET | `/api/database/:guildId/tables` | Lista tabel |
| GET | `/api/database/:guildId/:table` | Dane z tabeli |
| POST | `/api/database/query` | Własne SELECT |

### Logi
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/logs/system` | Logi systemowe |
| GET | `/api/logs/activity` | Logi aktywności |
| GET | `/api/logs/db` | Logi bazy danych |

### Debug
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/debug/test` | Test modułu debug |
| POST | `/api/db/test-write` | Test zapisu do bazy |

## WebSocket

- Endpoint: `ws://{host}:3001/ws?guildId={guildId}`
- Eventy: `roleCreate`, `roleUpdate`, `roleDelete`, `guildMemberUpdate`
- Fallback: polling co 10s gdy WebSocket niedostępny

## Logger

System logowania do plików w `bot/logs/`:
- `system.log` — logi systemowe (start, błędy)
- `activity.log` — aktywność (komendy, eventy)
- `db.log` — operacje na bazie danych

Dostępny przez `app.locals.logger`:
- `logger.system(type, msg, source)`
- `logger.activity(type, msg, source)`
- `logger.db(type, msg, source)`
- `logger.info(msg, source)`, `logger.warn(msg, source)`, `logger.error(msg, source)`
