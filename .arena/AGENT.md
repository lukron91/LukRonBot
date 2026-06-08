# Instrukcja dla agenta Arena.ai

## Jak wznowic prace

Wystarczy link do repo. Agent powinien natychmiast:

1. Sklonowac `https://github.com/lukron91/LukRonBot.git` i `git checkout dev`
2. Przeczytac ten plik (`.arena/AGENT.md`)
3. Przeczytac `.arena/STATE.md` - biezacy stan projektu
4. Przeczytac `.arena/SESSION.md` - historia zmian z ostatniej sesji
5. Zapytac uzytkownika od czego kontynuowac

---

## Projekt: LukRonBot

**Discord bot + panel zarzadzania (Next.js 14 + MongoDB)**
- Repozytorium: `lukron91/LukRonBot`
- Galaz robocza: `dev` (NIGDY nie pracuj na `main` bez wyraznego polecenia!)

### Struktura katalogow

LukRonBot/
- bot/               Bot Discord (Node.js + Express)
  - index.js         Serwer, MongoDB, ladowanie modulow
  - modules/         Moduly bota
  - commands/        Pliki komend Slash
- panel/             Panel webowy (Next.js 14 App Router)
  - app/             Strony i API routes
    - layout.jsx     Root layout + Providers
    - providers.jsx  ThemeProvider
    - globals.css    Globalne style + system przyciskow
    - dashboard/     Dashboard (wymaga zalogowania)
      - layout.jsx   Sidebar + top-bar + statusy
      - bot-settings/ Health, moduly, komendy, logi
      - theme/       Ustawienia motywu
      - config/      Konfiguracja bota
      - moderation/  Moderacja (users, settings)
    - servers/       Wybor serwera Discord
    - api/proxy/     Proxy panel -> bot API
  - components/
    - Modal.jsx      Uniwersalny modal (zgodny z motywem)
  - lib/
    - theme-context.jsx  System motywow
  - public/resources/    Obrazy (logo, baner)
- .arena/            System ciaglosci agentow
- README.md          Strona glowna GitHub

---

## Kluczowe zasady techniczne

### System przyciskow (globals.css)
Wszystkie przyciski MUSZA uzywac standardowych klas:
- btn-base + btn-standard - kolor akcentu (oglne akcje)
- btn-base + btn-success - zielony (zapisz/zatwierdz)
- btn-base + btn-danger - czerwony (usun/anuluj)
- btn-base + btn-warning - zolty (status idle/away)
- btn-base + btn-dnd - ciemna czerwien (Do Not Disturb)
- btn-status - pill status bota

ZAKAZ: inline style={{background: ...}} na przyciskach, gradienty - tylko jednolite kolory.

### System motywow (theme-context.jsx)
- useTheme() zwraca { theme, updateTheme, accentColor }
- Wszystkie komponenty MUSZA uzywac CSS variables: var(--bg-color), var(--text-color), var(--border-color), var(--surface-rgb), var(--accent-color), var(--border-radius)
- ZAKAZ twardych kolorow #xxx w JSX - uzywaj CSS variables
- Kazda strona musi importowac useTheme() dla accentColor

### Komponent Modal
- Import: import Modal from '@/components/Modal'
- Props: isOpen, onClose, title, children, width (opcjonalnie)
- ZAKAZ uzywania window.confirm() - zawsze Modal

### MongoDB
- Srodowisko: BOT_ENV=test (lokalnie) / BOT_ENV=main (produkcja)
- Kolekcje: global_configs, guild_configs, activities, moderation
- UWAGA: initDbStructure() musi tworzyc puste kolekcje przy starcie bota!

### Checkboxy -> Switche
- Uzywaj <label className="toggle-switch"><input type="checkbox" ...><span className="slider"></span></label>
- Zwykle checkboxy sa niedozwolone w UI

### Logowanie (Discord OAuth)
- Logowanie przez Discord -> callback -> dane sesji do localStorage
- Panel sprawdza sesje w DashboardLayout

---

## Czego NIE robic

1. Nie pracuj na `main` - zawsze `dev`
2. Nie uzywaj `window.confirm()` - zawsze Modal
3. Nie uzywaj gradientow na przyciskach - jednolite kolory
4. Nie hardcoduj kolorow w JSX - CSS variables
5. Nie uzywaj template literalow w fetch() przy SSR - konkatenacja stringow
6. Nie dodawaj zwyklych checkboxow - tylko toggle-switch
7. Po kazdej zmianie: commituj z opisem po polsku i aktualizuj .arena/SESSION.md + .arena/STATE.md

---

## Proces pracy

1. git pull origin dev
2. Praca nad kodem
3. git add -A
4. git commit -m "krotki opis po polsku"
5. Aktualizacja .arena/SESSION.md (dodaj wpis)
6. Aktualizacja .arena/STATE.md (jesli zmienil sie stan)
7. git push origin dev
8. Poinformuj uzytkownika co zrobiono
