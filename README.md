# 🤖 LukRonBot

**Profesjonalny bot Discord z panelem zarządzania webowym.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-blue)](https://github.com/WiseLibs/better-sqlite3)
[![Discord](https://img.shields.io/badge/Discord-API-5865f2)](https://discord.com/developers/)

---

## ✨ Funkcje

- 🎛️ **Panel webowy** — pełna kontrola nad botem przez przeglądarkę
- 🎨 **System motywów** — dark/light mode, własny kolor akcentu, przezroczystość, wzory tła
- ⚡ **Dynamiczny loader komend** — Slash Commands rejestrowane automatycznie
- 🛡️ **Moderacja** — warny, mute, bany (Discord + rangowy shadow-ban)
- 📊 **Statystyki** — aktywność użytkowników, logi systemowe, trend 7 dni
- 🔐 **Logowanie przez Discord OAuth**
- 🗄️ **SQLite** — osobna baza danych na każdy serwer
- 🔄 **WebSocket** — eventy Discord w czasie rzeczywistym

---

## 🏗️ Struktura

```
LukRonBot/
├── bot/           # Bot Discord (Node.js + Express + SQLite)
├── panel/         # Panel webowy (Next.js 16 App Router)
├── botmanager/    # Zarządzanie procesami (port 3002)
├── .docs/         # Dokumentacja projektu
└── .deepseek/     # System ciągłości agentów AI
```

---

## 🚀 Szybki start

### Wymagania
- Node.js 18+
- Aplikacja Discord (Bot + OAuth2)

### Instalacja

```bash
git clone https://github.com/lukron91/LukRonBot.git
cd LukRonBot

# Bot
cd bot
npm install
cp .env.example .env   # skonfiguruj tokeny
node index.js

# Panel
cd ../panel
npm install
cp .env.example .env.local
npm run dev
```

### Zmienne środowiskowe

**Bot (.env):**
```
DISCORD_BOT_TOKEN=xxx
BOT_ENV=test
BOT_API_PORT=3001
```

**Panel (.env.local):**
```
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
REDIRECT_URI=http://localhost:3000/api/auth/callback
BOT_API_URL=http://localhost:3001
NEXT_PUBLIC_DISCORD_CLIENT_ID=xxx
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
NEXT_PUBLIC_OWNER_ID=xxx
```

---

## 📚 Dokumentacja

Szczegółowa dokumentacja znajduje się w folderze `.docs/project/`:

| Plik | Opis |
|------|------|
| [ARCHITECTURE.md](.docs/project/ARCHITECTURE.md) | Architektura projektu |
| [BOT.md](.docs/project/BOT.md) | Bot Discord — endpointy, moduły |
| [PANEL.md](.docs/project/PANEL.md) | Panel webowy — strony, motywy, komponenty |
| [DATABASE.md](.docs/project/DATABASE.md) | Baza danych SQLite — schematy, tabele |
| [BOTMANAGER.md](.docs/project/BOTMANAGER.md) | Bot Manager — zarządzanie procesami |

---

## 📋 Roadmap

| Etap | Status |
|------|--------|
| Fundamenty (baza SQLite, logi, moduły) | ✅ Gotowe |
| Silnik i moduły (komendy, role) | ✅ Gotowe |
| System motywów (opacity, wzory, style) | ✅ Gotowe |
| Logika moderacji (bany, odwołania) | ⏸️ Zaplanowane |
| System ticketów | ⏳ Planowane |
| Automod | ⏳ Planowane |
| Powitania | ⏳ Planowane |

---

## 🤖 AI Agent Continuity

Ten projekt jest rozwijany z pomocą agentów AI. System `.deepseek/` umożliwia płynne wznawianie pracy w nowych sesjach.

Zobacz [AGENTS.md](AGENTS.md) dla globalnych wytycznych agentów.

---

## 📄 Licencja

MIT
