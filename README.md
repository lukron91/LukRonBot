# 🤖 LukRonBot

**Profesjonalny bot Discord z panelem zarządzania webowym.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)
[![Discord](https://img.shields.io/badge/Discord-API-5865f2)](https://discord.com/developers/)

---

## ✨ Funkcje

- 🎛️ **Panel webowy** — pełna kontrola nad botem przez przeglądarkę
- 🎨 **System motywów** — dark/light mode, własny kolor akcentu, glassmorphism
- ⚡ **Dynamiczny loader komend** — Slash Commands rejestrowane automatycznie
- 🛡️ **Moderacja** — warny, mute, bany (Discord + rangowy shadow-ban)
- 📊 **Statystyki** — aktywność użytkowników, logi systemowe
- 🔐 **Logowanie przez Discord OAuth**

---

## 🏗️ Struktura

```
LukRonBot/
├── bot/           # Bot Discord (Node.js + Express)
├── panel/         # Panel webowy (Next.js 14 App Router)
└── .arena/        # System ciągłości agentów AI
```

---

## 🚀 Szybki start

### Wymagania
- Node.js 18+
- MongoDB Atlas (lub lokalna instancja)
- Aplikacja Discord (Bot + OAuth2)

### Instalacja

```bash
git clone https://github.com/lukron91/LukRonBot.git
cd LukRonBot

# Bot
cd bot
npm install
cp .env.example .env   # skonfiguruj tokeny
npm start

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
MONGODB_URI=mongodb+srv://...
BOT_ENV=test
BOT_API_PORT=3001
```

**Panel (.env.local):**
```
NEXT_PUBLIC_DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
```

---

## 📋 Roadmap

| Etap | Status |
|------|--------|
| Fundamenty (baza, logi, index.js) | 🟡 W trakcie |
| Silnik i moduły (komendy) | ✅ Gotowe |
| Logika moderacji (bany, odwołania) | ⏸️ Zaplanowane |
| Szlify panelu (UI) | 🟡 W trakcie |

---

## 🤖 AI Agent Continuity

Ten projekt jest rozwijany z pomocą agentów AI na Arena.ai. System `.arena/` umożliwia płynne wznawianie pracy w nowych sesjach.

Zobacz [.arena/AGENT.md](.arena/AGENT.md) jeśli jesteś agentem AI.

---

## 📄 Licencja

MIT
