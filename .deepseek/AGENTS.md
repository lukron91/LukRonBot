# Instrukcja dla agenta DeepSeek — LukRonBot

## Opis projektu

**LukRonBot** — Discord bot + panel zarządzania (Next.js 14 App Router) + MongoDB Atlas.

### Stack technologiczny

- **Bot:** Node.js + Express 5 + Discord.js v14 + Mongoose 9
- **Panel:** Next.js 16 (App Router) + React 19 + react-icons + Tailwind CSS 4
- **Baza danych:** MongoDB Atlas (dwa środowiska: `main` — produkcja, `test` — development)
- **Hosting:** Wispbyte (VPS)
- **Manager:** `manager.bat` uruchamia `botmanager/server.js` na porcie 3002

### Repozytorium GitHub

- **URL:** https://github.com/lukron91/LukRonBot
- **Gałąź robocza:** `dev` (NIGDY nie pracuj na `main` bez wyraźnego polecenia!)
- **Token API:** w `.deepseek/secrets.local`

---

## Struktura folderów

```
LukRonBot/
├── bot/                          Bot Discord (Node.js + Express)
│   ├── index.js                  Serwer, MongoDB, ładowanie modułów, WebSocket
│   ├── db.js                     Połączenie MongoDB, makeModel(), plugin logowania DB
│   ├── package.json              Zależności: discord.js, express, mongoose, ws, dotenv, cors
│   ├── status.json               (zastąpiony przez MongoDB — legacy)
│   ├── commands/                 Pliki komend Slash
│   │   └── ping.js               Testowa komenda
│   ├── modules/                  Moduły bota (API + logika)
│   │   ├── activity.js           Logi aktywności (makeModel)
│   │   ├── commands.js           Dynamic Command Loader + rejestracja Slash Commands
│   │   ├── config.js             Konfiguracja serwerów (makeModel)
│   │   ├── debug.js              Debugowanie (makeModel)
│   │   ├── health.js             Endpoint health check
│   │   ├── moderation.js         System moderacji (warn/mute/ban/unmute/unban)
│   │   ├── roles.js              Zarządzanie rolami Discord (WebSocket + REST)
│   │   └── status.js             Status bota (MongoDB zamiast pliku)
│   └── events/                   Eventy Discord (future)
├── panel/                        Panel webowy (Next.js 16 App Router)
│   ├── app/
│   │   ├── globals.css           Globalne style + system przycisków + tokeny
│   │   ├── layout.jsx            Root layout + Providers
│   │   ├── providers.jsx         ThemeProvider
│   │   ├── page.jsx              Strona logowania
│   │   ├── api/
│   │   │   ├── auth/             Discord OAuth (login/callback/logout/me)
│   │   │   └── proxy/[...path]/  Proxy route — ukrywa adres VPS bota
│   │   ├── servers/              Strona wyboru serwera
│   │   └── dashboard/            Panel zarządzania
│   │       ├── layout.jsx        Sidebar + baner + statusy
│   │       ├── page.jsx          Przegląd
│   │       ├── config/           Konfiguracja ogólna serwera
│   │       ├── bot-settings/     Ustawienia bota + komendy
│   │       ├── roles/            Zarządzanie rolami (CRUD + WebSocket)
│   │       ├── moderation/
│   │       │   ├── users/        Lista użytkowników + kary
│   │       │   └── settings/     Ustawienia moderacji
│   │       ├── theme/            Ustawienia motywu (dark/light, accent, radius, filled/outline)
│   │       ├── tickets/          Placeholder
│   │       ├── automod/          Placeholder
│   │       ├── welcome/          Placeholder
│   │       └── logs/             Placeholder
│   ├── components/
│   │   └── Modal.jsx             Uniwersalny komponent modalny
│   └── lib/
│       └── theme-context.jsx     System motywów (CSS variables + localStorage)
├── botmanager/                   Panel zarządzania procesem bota (port 3002)
│   ├── server.js                 Serwer Node.js
│   └── public/
│       └── index.html            Interfejs webowy
├── manager.bat                   Skrypt uruchamiający botmanager
├── .deepseek/                    System ciągłości agentów DeepSeek
│   ├── AGENTS.md                 Niniejszy plik — instrukcja dla agenta
│   ├── secrets.local             Klucz API GitHub + link do repo (NIGDY nie commitować!)
│   ├── history/                  Historia commitów
│   └── logs/                     Szczegółowe logi sesji
└── .gitignore
```

---

## Konwencje kodu

### Gałąź
- **Zawsze pracuj na gałęzi `dev`.** NIGDY na `main` bez wyraźnego polecenia.

### MongoDB — nazwy kolekcji
- `makeModel(name, schema)` w `db.js` automatycznie dodaje prefiks:
  - `main_` dla produkcji (BOT_ENV=main)
  - `test_` dla testów (BOT_ENV=test)
- Przykład: `makeModel('guild_config', ...)` → kolekcja `test_guild_config` lub `main_guild_config`
- Nie używaj `col()` ani ręcznego `getActiveEnv()` — wszystko przez `makeModel` z `db.js`

### Kolejność startu bota
- `connectDB()` musi być **await** przed `loadAllModules()` — moduły potrzebują bazy danych.
- `initDbStructure()` wywoływana po `connectDB()`, tworzy kolekcje i indeksy.

### Proxy route (panel → bot)
- Panel używa `/api/proxy/...` żeby ukryć adres VPS bota.
- Proxy route w `panel/app/api/proxy/[...path]/route.js` przekierowuje do `BOT_API_URL`.
- Wszystkie fetch w komponentach panelu używają `/api/proxy/api/...`.

### Klucz API i repo
- Klucz GitHub API i link do repo są w `.deepseek/secrets.local`.
- **NIGDY nie commitować `secrets.local`** — wpisane w `.gitignore`.

### System przycisków (globals.css)
- Zawsze: `className="btn-base btn-[typ]"`
- Typy: `btn-standard`, `btn-success`, `btn-danger`, `btn-warning`, `btn-dnd`
- Kontenery: `btn-row`, `btn-row-lg`, `btn-col`, `btn-row-end`
- ZAKAZ: `style={{ background: ... }}` na przyciskach, gradientów, hardkodowanych kolorów
- Styl (filled/outline) kontrolowany przez `html.btn-outline-mode`

### System motywów
- `useTheme()` zwraca `{ theme, updateTheme, accentColor }`
- CSS variables: `--bg-color`, `--text-color`, `--border-color`, `--surface-rgb`, `--accent-color`, `--border-radius`
- ZAKAZ hardkodowanych kolorów `#xxx` w JSX — zawsze CSS variables

### Fetch w komponentach
- ZAKAZ template literals w `fetch()` przy SSR — używaj konkatenacji stringów
- Dobrze: `fetch('/api/proxy/api/guilds/' + guildId + '/members')`
- Źle: `` fetch(`/api/proxy/api/guilds/${guildId}/members`) ``

### Inne
- Checkboxy → zawsze toggle-switch: `<label className="toggle-switch"><input type="checkbox" /><span className="slider"></span></label>`
- `window.confirm()` → zawsze Modal
- Komponent Modal: `import Modal from '@/components/Modal'`

---

## Procedura naprawy błędów

Gdy użytkownik zgłasza błąd, postępuj w tej kolejności:

### Krok 1: git diff z dev
```bash
git diff dev -- <problematic-file>
```
Zobacz co zostało zmienione w stosunku do oryginału z repo.

### Krok 2: Analiza oryginalnego pliku
Pobierz oryginalną wersję pliku z GitHub używając klucza API z `secrets.local`:
```bash
curl -H "Authorization: token GH_TOKEN" \
  "https://raw.githubusercontent.com/lukron91/LukRonBot/dev/sciezka/do/pliku"
```

### Krok 3: Próba naprawy
Na podstawie porównania diffa z oryginałem — napraw błąd.

### Krok 4: Przywróć oryginał jeśli naprawa się nie uda
Jeśli naprawa nie działa:
```bash
curl -H "Authorization: token GH_TOKEN" \
  "https://raw.githubusercontent.com/lukron91/LukRonBot/dev/sciezka/do/pliku" > sciezka/do/pliku
```

---

## Zaimplementowane komendy i funkcje

### Bot — komendy Discord (Slash Commands)
| Komenda | Opis | Status |
|---------|------|--------|
| `/ping` | Testowa komenda sprawdzająca responsywność bota | ✅ Gotowe |

### Bot — endpointy REST API

| Endpoint | Moduł | Opis | Status |
|----------|-------|------|--------|
| `GET /api/status` | index.js | Status bota | ✅ Gotowe |
| `GET /api/database/status` | index.js | Status MongoDB | ✅ Gotowe |
| `GET /api/bot/health` | health.js | Health check | ✅ Gotowe |
| `GET /api/logs/system` | index.js | Logi systemowe | ✅ Gotowe |
| `GET /api/logs/activity` | index.js | Logi aktywności | ✅ Gotowe |
| `GET /api/logs/db` | index.js | Logi bazy danych | ✅ Gotowe |
| `GET /api/guilds/:id/config` | config.js | Konfiguracja serwera | ✅ Gotowe |
| `POST /api/guilds/:id/config` | config.js | Zapis konfiguracji | ✅ Gotowe |
| `POST /api/guilds/:id/config/moderation` | config.js | Zapis ustawień moderacji | ✅ Gotowe |
| `GET /api/guilds/:id/channels` | moderation.js | Lista kanałów | ✅ Gotowe |
| `GET /api/guilds/:id/members` | moderation.js | Lista członków | ✅ Gotowe |
| `GET /api/guilds/:id/roles` | moderation.js | Lista ról | ✅ Gotowe |
| `GET /api/guilds/:id/punishments/:userId` | moderation.js | Historia kar | ✅ Gotowe |
| `GET /api/guilds/:id/punishments/:userId/active` | moderation.js | Aktywne kary | ✅ Gotowe |
| `DELETE /api/guilds/:id/punishments/warn/:warnId` | moderation.js | Usuń warna | ✅ Gotowe |
| `POST /api/guilds/:id/moderation/warn` | moderation.js | Nadaj warna | ✅ Gotowe |
| `POST /api/guilds/:id/moderation/mute` | moderation.js | Wyciszenie | ✅ Gotowe |
| `POST /api/guilds/:id/moderation/ban` | moderation.js | Ban (discord/role) | ✅ Gotowe |
| `POST /api/guilds/:id/moderation/unmute` | moderation.js | Odciszenie | ✅ Gotowe |
| `POST /api/guilds/:id/moderation/unban` | moderation.js | Odbanowanie | ✅ Gotowe |
| `GET /api/commands` | commands.js | Lista komend z pamięci | ✅ Gotowe |
| `GET /api/commands/registered-guild/:id` | commands.js | Zarejestrowane guild | ✅ Gotowe |
| `GET /api/commands/registered-global` | commands.js | Zarejestrowane globalne | ✅ Gotowe |
| `POST /api/commands/register` | commands.js | Rejestracja komend | ✅ Gotowe |
| `DELETE /api/commands/unregister` | commands.js | Wyrejestrowanie | ✅ Gotowe |
| `GET /api/guilds/:id/roles/detailed` | roles.js | Role z detalami | ✅ Gotowe |
| `POST /api/guilds/:id/roles` | roles.js | Utwórz rolę | ✅ Gotowe |
| `PATCH /api/guilds/:id/roles/:roleId` | roles.js | Edytuj rolę | ✅ Gotowe |
| `DELETE /api/guilds/:id/roles/:roleId` | roles.js | Usuń rolę | ✅ Gotowe |
| `POST /api/guilds/:id/roles/:roleId/copy` | roles.js | Kopiuj rolę | ✅ Gotowe |
| `POST /api/guilds/:id/roles/:roleId/move` | roles.js | Przesuń rolę | ✅ Gotowe |
| `GET /api/guilds/:id/roles/:roleId/members` | roles.js | Członkowie roli | ✅ Gotowe |
| `POST /api/guilds/:id/roles/:roleId/members/:userId` | roles.js | Nadaj/odbierz rolę | ✅ Gotowe |

### Panel — strony

| Strona | Opis | Status |
|--------|------|--------|
| `/` | Strona logowania przez Discord | ✅ Gotowe |
| `/servers` | Wybór serwera | ✅ Gotowe |
| `/dashboard` | Przegląd serwera | ✅ Gotowe |
| `/dashboard/config` | Konfiguracja ogólna | ✅ Gotowe |
| `/dashboard/bot-settings` | Ustawienia bota + komendy | ✅ Gotowe |
| `/dashboard/roles` | Zarządzanie rolami (CRUD + WS) | ✅ Gotowe |
| `/dashboard/theme` | Ustawienia motywu | ✅ Gotowe |
| `/dashboard/moderation/users` | Lista użytkowników + kary | ✅ Gotowe |
| `/dashboard/moderation/settings` | Ustawienia moderacji | ✅ Gotowe |
| `/dashboard/tickets` | Placeholder | ⏳ Planowane |
| `/dashboard/automod` | Placeholder | ⏳ Planowane |
| `/dashboard/welcome` | Placeholder | ⏳ Planowane |
| `/dashboard/logs` | Placeholder | ⏳ Planowane |

### WebSocket
- Bot: `WebSocketServer` na `/ws` (ten sam port co REST)
- Klienci panelu łączą się przez `ws://.../ws?guildId=XXX`
- Eventy: roleCreate, roleUpdate, roleDelete, guildMemberUpdate
- Fallback: polling co 10s gdy WS niedostępny

---

## Aktualny status projektu

**Data:** 2026-06-09

### Co działa
- ✅ System logowania przez Discord OAuth
- ✅ Dashboard layout (sidebar, baner, statusy, nawigacja)
- ✅ System motywów (dark/light, accent, radius, opacity, filled/outline)
  - ✅ Opacity: bezpośrednie wartości (0.0-1.0), brak inwersji
  - ✅ `--tab-opacity` steruje przezroczystością kart sekcji
  - ✅ `--panel-opacity` steruje przezroczystością wrappera strony
  - ✅ `--window-opacity` steruje przezroczystością modali
  - ✅ Accent-color border na sekcjach i kartach
- ✅ System przycisków globalny (5 typów + kontenery)
- ✅ Dynamiczny loader komend (Slash Commands)
- ✅ Komponent Modal (z-index 9999, overlay blur)
- ✅ Toggle switch
- ✅ Lista użytkowników moderacji + historia kar
- ✅ Ustawienia moderacji (z error state)
- ✅ Panel zarządzania rolami (CRUD, WebSocket + polling)
- ✅ Wszystkie endpointy moderacji (warn/mute/ban/unmute/unban)
- ✅ WebSocket dla eventów Discord
- ✅ Refaktor modułów na makeModel/mongoose (prefiks BOT_ENV)
- ✅ Plugin logowania DB (mongoose)

### Co nie działa / niedokończone
- ❌ `initDbStructure()` nie tworzy pustych kolekcji MongoDB przy starcie (KRYTYCZNE)
- ❌ System banowania rangowego (Role Ban) — niezaimplementowany
- ❌ Kanał odwołań przez ticket — niezaimplementowany
- ❌ Strony placeholder: tickets, automod, welcome, logs
- ❌ System ról hierarchicznych (parent/child) — zaplanowany w DESIGN.md

### Priorytety na następną sesję
1. `initDbStructure()` — tworzenie pustych kolekcji przy starcie
2. System banowania + kanał odwołań (ETAP 3)
3. System ról hierarchicznych (parent/child + automat bota)
4. Wypełnienie stron placeholder

---

## Instrukcja dla agenta DeepSeek

### Przed rozpoczęciem pracy

1. **Przeczytaj AGENTS.md** (ten plik) — zapoznaj się z projektem i konwencjami.
2. **Przeczytaj najnowsze pliki** z `.deepseek/history/` i `.deepseek/logs/` — sprawdź co było robione.
3. **Sprawdź gałąź:**
   ```bash
   git branch --show-current
   ```
   Jeśli nie jesteś na `dev` — przełącz się:
   ```bash
   git checkout dev
   ```
4. **Sprawdź czy poprzedni agent skończył:**
   ```bash
   git log --oneline -5
   ```
   Porównaj z ostatnim wpisem w `.deepseek/logs/`. Jeśli ostatni commit w logach nie zgadza się z ostatnim commitem na repo — zapytaj użytkownika.

### Podczas pracy

- **Commituj po każdym ukończonym tasku** z opisowym komentarzem po polsku.
- **Złota zasada: Log → Push, zawsze razem.** NIGDY nie pushuj bez logu.
- Po każdym commicie dopisz wpis do pliku logu w `.deepseek/logs/`.
- Używaj `/endtask` po każdym ukończonym tasku.

### Proces pracy (KAŻDY COMMIT)

```
1. git pull origin dev
2. Praca nad kodem
3. git add -A
4. git commit -m "krótki opis po polsku"
5. ════ STOP — DOPISZ LOG TERAZ ════
   Dopisz wpis do .deepseek/logs/YYYY-MM-DD.md
   git add .deepseek/logs/YYYY-MM-DD.md
   git commit -m "Log: opis commitu"
6. git push origin dev
7. Poinformuj użytkownika co zrobiono
```

### Czego NIE robić

1. **NIGDY nie pracuj na `main`** — zawsze `dev`
2. **NIGDY nie commituj `secrets.local`** — wpisane w `.gitignore`
3. Nie używaj `window.confirm()` — zawsze Modal
4. Nie używaj gradientów na przyciskach — jednolite kolory
5. Nie hardkoduj kolorów w JSX — CSS variables
6. Nie używaj template literals w `fetch()` przy SSR
7. Nie dodawaj zwykłych checkboxów — tylko toggle-switch
8. Nie pushuj bez logu

### Po zakończeniu sesji

- Zaktualizuj ten plik (AGENTS.md) jeśli zmienił się stan projektu.
- Upewnij się że wszystkie commity mają odpowiadające im wpisy w logach.
- Użyj `/endtask`.
