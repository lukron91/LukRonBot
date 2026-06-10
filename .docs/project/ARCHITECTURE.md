# Architektura projektu — LukRonBot

## Przegląd

LukRonBot to Discord bot z webowym panelem zarządzania. System składa się z trzech głównych komponentów:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Discord    │◄───►│  Bot (3001)  │◄───►│  Panel (3000)│
│  API        │     │  Node.js     │     │  Next.js     │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  SQLite      │     │  Discord     │
                    │  (per guild) │     │  OAuth       │
                    └──────────────┘     └──────────────┘
```

## Komponenty

### 1. Bot Discord (`bot/`)
- **Port:** 3001
- **Stack:** Node.js + Express 5 + Discord.js v14
- **Baza danych:** SQLite (better-sqlite3) — osobna baza na serwer
- **WebSocket:** `/ws` — eventy Discord w czasie rzeczywistym
- **System modułów:** dynamiczne ładowanie z `bot/modules/`

### 2. Panel webowy (`panel/`)
- **Port:** 3000
- **Stack:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **Autoryzacja:** Discord OAuth2
- **Proxy API:** `/api/proxy/[...path]` → bot (ukrywa adres VPS)

### 3. Bot Manager (`botmanager/`)
- **Port:** 3002
- **Stack:** Express (statyczny serwer)
- **Funkcja:** Zarządzanie procesami bota i panelu (start/stop/restart)

## Przepływ danych

1. Użytkownik loguje się przez Discord OAuth → sesja w localStorage
2. Panel komunikuje się z botem przez `/api/proxy/...`
3. Bot proxy przekierowuje zapytania do Express API bota
4. Bot odczytuje/zapisuje dane w SQLite (osobna baza na serwer Discord)
5. Eventy Discord (role, członkowie) → WebSocket → panel w czasie rzeczywistym

## Baza danych

### SQLite (better-sqlite3)
- Osobny plik `.db` na każdy serwer Discord: `{BOT_ENV}_{guildId}.db`
- Pliki w `bot/data/`
- Środowiska: `test_` (development), `main_` (produkcja)
- WAL mode dla wydajności

### Tabele
| Tabela | Opis |
|--------|------|
| `config` | Klucz-wartość (globalne ustawienia) |
| `guild_config` | Konfiguracja serwera (prefix, język, itp.) |
| `moderation_settings` | Ustawienia moderacji |
| `punishments` | Historia kar (warn/mute/ban/kick) |
| `activities` | Statystyki aktywności |
| `global_config` | Globalne ustawienia bota |
| `welcome_settings` | Ustawienia powitań |
| `role_groups` | Grupy ról hierarchicznych |
| `tickets` | System ticketów |

## Autoryzacja

1. Użytkownik klika "Zaloguj przez Discord"
2. Przekierowanie do Discord OAuth (`/api/auth/login`)
3. Discord zwraca kod autoryzacyjny (`/api/auth/callback`)
4. Panel wymienia kod na access token
5. Pobiera dane użytkownika i listę serwerów
6. Zapisuje sesję w `localStorage` (jako JSON)
7. Proxy API weryfikuje sesję przed wysłaniem zapytania do bota
