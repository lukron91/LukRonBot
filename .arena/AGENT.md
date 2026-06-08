# Instrukcja dla agenta Arena.ai

## KROK 1 — Setup środowiska (zrób to ZANIM cokolwiek innego)

Uzytkownik podaje link do repo i token GitHub. Wykonaj od razu:

```bash
# Klonuj jesli brak
[ -d /home/user/LukRonBot ] || git clone https://TOKEN@github.com/lukron91/LukRonBot.git --branch dev /home/user/LukRonBot

cd /home/user/LukRonBot
git config user.email "arena-agent@arena.ai"
git config user.name "Arena Agent"
git remote set-url origin https://TOKEN@github.com/lukron91/LukRonBot.git
git pull origin dev
```

Zamien TOKEN na token podany przez uzytkownika.
Remote i git config resetuja sie miedzy sesjami basha — zawsze ustawiaj na poczatku.

---

## KROK 2 — Utwórz swój plik logów (zrób to PRZED pierwszym commitem)

```bash
ls .arena/logs/   # sprawdz jaki jest najwyzszy numer NNN
```

Utworz plik `.arena/logs/NNN-twoj-identyfikator.md` gdzie:
- `NNN` = kolejny numer (np. jesli jest 004, ty tworzysz 005)
- `twoj-identyfikator` = nazwa modelu lub unikalny ID (np. `gpt4o`, `gemini-25`, `claude-37`)
- ZAKAZ uzycia slowa `current` lub samego `agent` — zawsze unikalny identyfikator

Przyklad nazwy: `005-gemini-25.md`, `006-claude-37.md`, `007-gpt4o.md`

Format pliku:
```markdown
# Log NNN — identyfikator (YYYY-MM-DD)

**Model:** [nazwa modelu]
**Gałąź:** `dev`

---

## Commit 1: `hash` — krotki opis

### Co zmieniono
- `sciezka/do/pliku`:
  - konkretna zmiana 1
  - konkretna zmiana 2
```

Po kazdym commicie dopisuj nowy wpis do TEGO samego pliku.
Na koniec sesji zaktualizuj `.arena/SESSION.md` i `.arena/STATE.md`.

---

## KROK 3 — Przeczytaj stan projektu

- `.arena/STATE.md` — aktualny stan, roadmap, priorytety
- `.arena/SESSION.md` — historia commitów poprzednich agentów
- `.arena/logs/` — szczegółowe logi każdego agenta

Potem zapytaj uzytkownika od czego zaczynamy.

---

## Projekt: LukRonBot

**Discord bot + panel zarządzania (Next.js 14 + MongoDB)**
- Repozytorium: `lukron91/LukRonBot`
- Gałąź robocza: `dev` (NIGDY nie pracuj na `main` bez wyraźnego polecenia!)

### Struktura katalogów

```
LukRonBot/
├── bot/                    Bot Discord (Node.js + Express)
│   ├── index.js            Serwer, MongoDB, ładowanie modułów
│   ├── modules/            Moduły bota
│   └── commands/           Pliki komend Slash
├── panel/                  Panel webowy (Next.js 14 App Router)
│   ├── app/
│   │   ├── globals.css     Globalne style + system przycisków + tokeny
│   │   ├── layout.jsx      Root layout + Providers
│   │   ├── providers.jsx   ThemeProvider
│   │   └── dashboard/
│   │       ├── layout.jsx  Sidebar + baner + statusy
│   │       ├── bot-settings/
│   │       ├── theme/      Ustawienia motywu (filled/outline, kolory itd.)
│   │       ├── config/
│   │       └── moderation/
│   ├── components/
│   │   └── Modal.jsx       Uniwersalny modal
│   └── lib/
│       └── theme-context.jsx  System motywów
└── .arena/                 System ciągłości agentów
```

---

## Kluczowe zasady techniczne

### System przycisków (globals.css)
- Zawsze: `className="btn-base btn-[typ]"`
- Typy: `btn-standard`, `btn-success`, `btn-danger`, `btn-warning`, `btn-dnd`
- Kontenery przycisków: `btn-row`, `btn-row-lg`, `btn-col`, `btn-row-end`
- ZAKAZ: `style={{ background: ... }}` na przyciskach, gradientów, hardkodowanych kolorów
- Stała wysokość przez token `--btn-height` — nie nadpisuj `padding` wertykalnego
- Styl (filled/outline) kontrolowany przez `html.btn-outline-mode` — nie dotykaj

### System motywów (theme-context.jsx)
- `useTheme()` zwraca `{ theme, updateTheme, accentColor }`
- CSS variables: `var(--bg-color)`, `var(--text-color)`, `var(--border-color)`, `var(--surface-rgb)`, `var(--accent-color)`, `var(--border-radius)`
- ZAKAZ hardkodowanych kolorów `#xxx` w JSX — zawsze CSS variables
- Każda strona importuje `useTheme()` dla `accentColor`

### Komponent Modal
- `import Modal from '@/components/Modal'`
- Props: `isOpen`, `onClose`, `title`, `children`, `width` (opcjonalnie)
- ZAKAZ `window.confirm()` — zawsze Modal

### Fetch w komponentach
- ZAKAZ template literals w `fetch()` przy SSR — używaj konkatenacji stringów
- Dobrze: `fetch('/api/proxy/api/guilds/' + guildId + '/members')`
- Źle: `fetch(\`/api/proxy/api/guilds/${guildId}/members\`)`

### Inne
- Checkboxy → zawsze toggle-switch: `<label className="toggle-switch"><input type="checkbox" /><span className="slider"></span></label>`
- `window.confirm()` → zawsze Modal
- MongoDB: `BOT_ENV=test` (lokalnie) / `BOT_ENV=main` (produkcja)

---

## Czego NIE robić

1. Nie pracuj na `main` — zawsze `dev`
2. Nie używaj `window.confirm()` — zawsze Modal
3. Nie używaj gradientów na przyciskach — jednolite kolory
4. Nie hardkoduj kolorów w JSX — CSS variables
5. Nie używaj template literals w `fetch()` przy SSR
6. Nie dodawaj zwykłych checkboxów — tylko toggle-switch
7. Nie nazywaj pliku logu `current` ani `agent` bez ID

---

## Proces pracy (KAŻDY COMMIT)

1. `git pull origin dev`
2. Praca nad kodem
3. `git add -A`
4. `git commit -m "krotki opis po polsku"`
5. **Dopisz wpis do swojego pliku logów** `.arena/logs/NNN-twoj-id.md`
6. Zaktualizuj `.arena/SESSION.md` (dodaj wpis o commicie)
7. Zaktualizuj `.arena/STATE.md` (jeśli zmienił się stan projektu)
8. `git push origin dev`
9. Poinformuj użytkownika co zrobiono

---

## Pliki logów

- `.arena/logs/001-claude-qwen.md` — wczesna faza (Claude + Qwen)
- `.arena/logs/002-agent-019e9f72.md` — poprzedni agent (sesja sprzed zamrożenia)
- `.arena/logs/003-agent-019e9f72-cont.md` — kontynuacja poprzedniego agenta (sprint UI/UX)
- `.arena/logs/004-arena-agent.md` — arena-agent (fix guildId, system przycisków, baner, logi)
