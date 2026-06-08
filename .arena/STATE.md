# Stan projektu LukRonBot

Ostatnia aktualizacja: 2026-06-08

---

## GLOWNY ROADMAP

| Etap | Nazwa | Status |
|------|-------|--------|
| ETAP 1 | Fundamenty - architektura bazy, system logow, przebudowa bot/index.js | Czesciowo |
| ETAP 2 | Silnik i Moduly - Dynamic Command Loader, Slash Commands | Gotowe |
| ETAP 3 | Logika Moderacji - banowanie (Discord/Rangowy), kanal odwolan (szczegoly: DESIGN.md) | Zamrozony |
| ETAP 4 | Szlify Panelu - integracja UI z nowymi danymi | Zamrozony |

---

## SPRINT UI/UX (zakonczony)

| Krok | Zadanie | Status |
|------|---------|--------|
| Krok 1 | System motywow - light/dark, accent, radius, glassmorphism, filled/outline | Gotowe |
| Krok 2 | Standard komponentow UI - Modal, Switche, Design System, modal-* klasy | Gotowe |
| Krok 3 | Ikony w sidebar i zakladkach | Gotowe |
| Krok 4 | Baner dashboardu - wypelnienie, overlay, fade | Gotowe |
| Krok 5 | System tokenow przyciskow (--btn-height, btn-row itp.) | Gotowe |

---

## CO DZIALA

- Panel logowania przez Discord
- Dashboard layout (sidebar, baner, statusy, nawigacja)
- System motywow (dark/light, accent, radius, opacity, filled/outline przyciski)
- System przyciskow globalny (5 typow + btn-row/col/end + modal-* klasy)
- Dynamiczny loader komend (Slash Commands)
- Komponent Modal (zastepuje window.confirm, ze standardem zakladek)
- Toggle switch (zastepuje checkboxy)
- Lista uzytkownikow moderacji (z oknem akcji, historia kar)
- Ustawienia moderacji - error state zamiast crashu przy braku polaczenia
- Panel zarządzania rolami (CRUD, kopiowanie, nadawanie, real-time WS + polling fallback)

## ARCHITEKTURA — WebSocket

- Bot: `http.createServer(app)` + `WebSocketServer` na `/ws` (ten sam port co REST)
- Klienci panelu łączą się przez `ws://localhost:3001/ws?guildId=XXX`
- Bot broadcastuje eventy Discord: roleCreate, roleUpdate, roleDelete, guildMemberUpdate
- Panel fallback: polling co 10s gdy WS niedostępny
- WYMAGANE: `npm install ws` w katalogu `bot/`

---

## CO NIE DZIALA / NIEDOKONCZONE — BOT

### Zaimplementowane endpointy (od 2026-06-08, refactor makeModel)

Wszystkie ponizsze endpointy sa **dzialajace** po refactorze modułów:

| Endpoint | Modul | Opis |
|----------|-------|------|
| `GET /api/guilds/:id/config` | config.js | Konfiguracja serwera |
| `POST /api/guilds/:id/config` | config.js | Zapis konfiguracji |
| `POST /api/guilds/:id/config/moderation` | config.js | Zapis ustawien moderacji |
| `GET /api/guilds/:id/channels` | moderation.js | Lista kanalow tekstowych |
| `GET /api/guilds/:id/members` | moderation.js | Lista czlonkow z cache |
| `GET /api/guilds/:id/roles` | moderation.js | Lista ról |
| `GET /api/guilds/:id/punishments/:userId` | moderation.js | Historia kar |
| `GET /api/guilds/:id/punishments/:userId/active` | moderation.js | Aktywne mute/ban |
| `DELETE /api/guilds/:id/punishments/warn/:warnId` | moderation.js | Usun warna |
| `POST /api/guilds/:id/moderation/warn` | moderation.js | Nadanie warna |
| `POST /api/guilds/:id/moderation/mute` | moderation.js | Wyciszenie |
| `POST /api/guilds/:id/moderation/ban` | moderation.js | Ban (discord lub role) |
| `POST /api/guilds/:id/moderation/unmute` | moderation.js | Odciszenie |
| `POST /api/guilds/:id/moderation/unban` | moderation.js | Odbanowanie |

### Brakujace endpointy

(Wszystkie powyzsze sa juz zaimplementowane — ta sekcja jest archiwum)

| Endpoint | Uzywa | Opis |
|----------|-------|------|
| (brak) | - | Wszystkie wymagane endpointy zostaly zaimplementowane |

### Istniejace endpointy (dzialajace)

| Endpoint | Modul |
|----------|-------|
| `GET /api/guilds/:id/config` | config.js |
| `GET /api/guilds/:id/roles` | moderation.js |
| `GET /api/guilds/:id/members` | moderation.js |
| `GET /api/guilds/:id/punishments/:userId` | moderation.js — historia kar |
| `DELETE /api/guilds/:id/punishments/:punishmentId` | moderation.js |
| `POST /api/guilds/:id/punishments` | moderation.js — ogolne dodanie kary |

### Schema kary w MongoDB (moderation.js)

```js
{
  guildId: String,
  userId: String,
  moderatorId: String,
  type: String, // enum: ['warn', 'mute', 'ban', 'kick']
  reason: String,
  duration: Number,   // minuty (tylko mute)
  expiresAt: Date,    // (tylko mute)
  createdAt: Date     // automatyczne (timestamps: true)
}
```

Zeby unmute/unban pojawily sie w historii kar — zapisuj jako osobny dokument z `type: 'unmute'` lub `type: 'unban'`. Panel automatycznie wyswietli je przez PUNISHMENT_STYLE.

### Inne braki w bocie

- `initDbStructure()` nie tworzy pustych kolekcji MongoDB przy starcie (KRYTYCZNE)
- System banowania rangowego (Role Ban) — niezaimplementowany
- Kanal odwolan przez ticket — niezaimplementowany

---

## CO NIE DZIALA / NIEDOKONCZONE — PANEL

- Strony placeholder: tickets, automod, welcome, logs — puste
- Ustawienia moderacji: dziala ale wymaga brakujacych endpointow bota

---

## PRIORYTETY NA NASTEPNA SESJE (BOT)

1. Zaimplementowac brakujace endpointy moderacji (tabela powyzej)
2. initDbStructure() — tworzy puste kolekcje przy starcie
3. System banowania + kanal odwolan (ETAP 3, szczegoly w DESIGN.md)
4. System ról hierarchicznych (szczegoly w DESIGN.md) — wymaga bazy (kolekcja role_groups)

---

## SYSTEM RÓL HIERARCHICZNYCH — status: ZAPLANOWANY

Szczegółowy opis w `DESIGN.md` sekcja "SYSTEM RÓL HIERARCHICZNYCH".

Krótko:
- 3 typy ról: standardowa / nadrzędna (kategoria, pusta) / podrzędna (należy do kategorii)
- Bot automatycznie nadaje rolę nadrzędną gdy user dostaje podrzędną (listener guildMemberUpdate)
- Bot odbiera nadrzędną gdy user straci WSZYSTKIE podrzędne z tej grupy
- Wymaga kolekcji MongoDB `role_groups` (schemat w DESIGN.md)
- Panel UI (docelowy): rozwijane zakładki dla grup, dwa przyciski tworzenia
- Aktualny panel ról obsługuje TYLKO role standardowe — hierarchia do zrobienia po bazie
- DO ZROBIENIA: najpierw baza, potem endpoint /api/guilds/:id/role-groups, potem panel
