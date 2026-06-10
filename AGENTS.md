# Globalne wytyczne dla agentów — LukRonBot

Ten plik zawiera uniwersalne zasady obowiązujące każdego agenta (DeepSeek, Claude, GitHub Copilot, itp.) pracującego nad tym projektem.

---

## 1. Zasady ogólne

### Gałąź
- **Zawsze pracuj na gałęzi `dev`.** NIGDY na `main` bez wyraźnego polecenia użytkownika.

### Komunikacja z użytkownikiem
- Mów krótko i na temat. Nie rozwlekaj się.
- Jeśli coś jest niejasne — zapytaj, zanim zaczniesz działać.
- Po każdym zakończonym zadaniu poinformuj użytkownika co zostało zrobione.

### Bezpieczeństwo
- **NIGDY nie commituj plików zawierających tokeny, hasła, klucze API ani sekrety.**
- Nie wyświetlaj sekretów w odpowiedzi ani w terminalu.
- Nie pushuj na repo bez upewnienia się, że sekrety nie wyciekły.

---

## 2. Proces pracy (KAŻDY COMMIT)

```
1. git pull origin dev
2. Praca nad kodem
3. git add -A
4. git commit -m "krótki opis po polsku"
5. git push origin dev
6. Poinformuj użytkownika co zrobiono
```

### Zasady commitowania
- Commituj po każdym ukończonym, działającym tasku.
- Komentarze commitów po polsku, krótkie i opisowe.
- Jeden commit = jedna logiczna zmiana.
- Nie commituj rzeczy niegotowych ani połamanych.

---

## 3. Konwencje kodu

### Styl ogólny
- Używaj istniejących konwencji w projekcie (spójność > własne preferencje).
- Nie dodawaj zbędnych zależności — jeśli da się zrobić bez biblioteki, zrób bez.
- Nie zostawiaj zakomentowanego kodu ani `console.log` w finalnej wersji.

### Komponenty i pliki
- Jeden komponent = jeden plik.
- Nazwy plików: kebab-case dla plików, PascalCase dla komponentów React.
- Eksportuj domyślnie główny komponent.

### Style
- Preferuj CSS variables i klasy z globalnego CSS nad inline styles.
- Nie hardkoduj kolorów, spacingów ani fontów — używaj zmiennych.
- Nie używaj `!important` jeśli można tego uniknąć.

---

## 4. System dokumentacji

### Folder `.docs/`
- Dokumentacja techniczna projektu znajduje się w folderze `.docs/` w głównym katalogu.
- Zawiera opisy architektury, API, konwencji, designu itp.

### Obowiązek weryfikacji wiedzy
Jeśli agent nie jest pewien jak działa dany fragment kodu, biblioteka, API lub konwencja:

1. **Przeszukaj folder `.docs/`** — sprawdź czy istnieje tam dokumentacja na ten temat.
2. **Jeśli nie ma w `.docs/`** — przeszukaj sieć (dokumentację biblioteki, Stack Overflow, oficjalne źródła).
3. **Dopiero potem** pytaj użytkownika.

Agent ma obowiązek samodzielnie zdobyć wiedzę, zanim zapyta użytkownika.

---

## 5. Przechowywanie danych agenta

Każdy agent pracujący nad tym projektem gromadzi swoje dane (logi, historię, notatki) w dedykowanym folderze w głównym katalogu projektu.

### Zasady

- **Każdy agent ma swój własny folder** w głównym katalogu projektu.
- Nazwa folderu zależy od agenta:
  - DeepSeek → `.deepseek/`
  - Claude → `.claude/`
  - GitHub Copilot → `.github/` (lub inny, jeśli skonfigurowany)
  - Inni agenci → według własnej konwencji, ale zawsze z kropką na początku (np. `.nazwaagenta/`)

### Struktura folderu agenta

Każdy folder agenta powinien zawierać:

| Plik/folder | Opis |
|-------------|------|
| `AGENTS.md` | Instrukcja dla agenta — konwencje, endpointy, status projektu |
| `secrets.local` | Klucze API, tokeny, linki do repo (**NIGDY nie commitować**) |
| `history/` | Historia commitów — pliki z opisami zmian |
| `logs/` | Szczegółowe logi sesji — pliki YYYY-MM-DD.md |

### Złota zasada: Log → Push, zawsze razem
- **NIGDY nie pushuj bez logu.**
- Po każdym commicie kodu dopisz wpis do pliku logu w `logs/`.
- Commit logu idzie razem z commitem kodu (lub jako osobny commit zaraz po).

### Bezpieczeństwo
- `secrets.local` musi być w `.gitignore` — **NIGDY nie commitować**.
- Nie przechowuj sekretów w logach ani w AGENTS.md.

---

## 6. Czego NIE robić

- Nie pracuj na gałęzi `main` — zawsze `dev`
- Nie commituj sekretów, tokenów, haseł, kluczy API
- Nie używaj `window.confirm()` — zawsze Modal
- Nie hardkoduj kolorów w JSX — używaj CSS variables
- Nie dodawaj zwykłych checkboxów — tylko toggle-switch
- Nie używaj template literals w `fetch()` przy SSR (konkatenacja stringów)
- Nie pushuj na repo bez upewnienia się że wszystko działa
- Nie zostawiaj połamanych commitów w historii

---

## 7. Stack technologiczny projektu

- **Bot:** Node.js + Express 5 + Discord.js v14
- **Panel:** Next.js (App Router) + React + Tailwind CSS
- **Baza danych:** MongoDB Atlas
- **Hosting:** Wispbyte (VPS)

Szczegółowe informacje o projekcie znajdują się w `.deepseek/AGENTS.md` oraz w folderze `.docs/`.

---

*Ostatnia aktualizacja: 2026-06-10*
