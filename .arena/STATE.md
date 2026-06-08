# Stan projektu LukRonBot

Ostatnia aktualizacja: 2026-06-08

---

## GLOWNY ROADMAP

| Etap | Nazwa | Status |
|------|-------|--------|
| ETAP 1 | Fundamenty - architektura bazy, system logow, przebudowa bot/index.js | Czesciowo |
| ETAP 2 | Silnik i Moduly - Dynamic Command Loader, Slash Commands | Gotowe |
| ETAP 3 | Logika Moderacji - banowanie (Discord/Rangowy), kanal odwolan | Zamrozony |
| ETAP 4 | Szlify Panelu - integracja UI z nowymi danymi | Zamrozony |

---

## SPRINT UI/UX & RESTORE (aktywny)

| Krok | Zadanie | Status |
|------|---------|--------|
| Krok 1 | System motywow - light/dark, accent, radius, glassmorphism | Gotowe |
| Krok 2 | Standard komponentow UI - Modal, Switche, Design System | Gotowe |
| Krok 3 | Moderacja - historia kar, API, UI | Nierozpoczety |

---

## CO DZIALA

- Panel logowania przez Discord
- Dashboard layout (sidebar, statusy, nawigacja)
- System motywow (dark/light, accent color, border radius, surface opacity)
- System przyciskow (5 typow: standard, success, danger, warning, dnd)
- Dynamiczny loader komend (Slash Commands)
- Komponent Modal (zastepuje window.confirm)
- Toggle switch (zastepuje checkboxy)
- Wszystkie 8 stron uzywa useTheme() i CSS variables

---

## CO NIE DZIALA / NIEDOKONCZONE

- Podstawowa struktura bazy danych - initDbStructure() nie tworzy pustych kolekcji przy starcie bota (KRYTYCZNE - ETAP 1)
- Baner dashboardu - nie wypelnia idealnie gornej ramki (kosmetyczne)
- Modul moderacji (bot/modules/moderation.js) - placeholder, brak endpointow
- System banowania (Discord vs Rangowy) - niezaimplementowany (ETAP 3)
- Kanal odwolan przez ticket - niezaimplementowany (ETAP 3)
- Historia kar - API i UI niezaimplementowane
- Strony placeholder: tickets, automod, welcome, logs - puste
- Optymalizacja odczytu logow (tail/streaming zamiast readFileSync)

---

## PRIORYTETY NA NASTEPNA SESJE

1. dokonczyc ETAP 1: initDbStructure() tworzy puste kolekcje MongoDB przy starcie
2. ETAP 3: System banowania + kanal odwolan
3. Baner: naprawic wypelnienie gornej ramki
