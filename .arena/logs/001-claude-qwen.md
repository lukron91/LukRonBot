# Log 001 — Claude i Qwen (wczesna faza projektu)

**Okres:** przed 2026-06-08
**Modele:** Claude (pozytywny wkład), Qwen (problematyczny)
**Źródło:** analiza historii rozmów i repozytorium

---

## Claude — co zrobił dobrze (zachowane w projekcie)

### Architektura bazy danych
- Zaproponował strukturę dwóch środowisk MongoDB: `main` i `test`
- Bot przy starcie odczytuje `BOT_ENV` z `.env` i wybiera odpowiedni katalog w bazie
- Pomysł: drugi bot testowy działa na `test`,oficjalny na `main` — rozwój nie wpływa na produkcję

### System logowania
- Stworzył podstawową strukturę `bot/index.js` z `connectDB()` i `loadAllModules()`
- Wprowadził model `GlobalConfig` z `mongoose.models.globalconfigs || mongoose.model(...)`
- Endpointy API w bocie: `/api/status`, `/api/database/status`

### Panel — fundamenty
- Struktura Next.js 14 App Router: `layout.jsx`, `providers.jsx`
- Logowanie przez Discord OAuth (callback → dane sesji)
- `DashboardLayout` z sidebar i sprawdzaniem sesji w `localStorage`
- Podstawowy `ThemeContext` (tylko accent color, bez dark/light)

### System komend
- Placeholder `bot/modules/commands.js`
- Folder `bot/commands/` na pliki komend

---

## Qwen — co zepsuł

### Błędy składniowe (wielokrotne)
- `err.//message` zamiast `err.message` w `bot-settings/page.jsx`
- `res.//json()` zamiast `res.json()` — podwójne slashe w wielu miejscach
- `className, a="module-error"` zamiast `className="module-error"` — skorodowane atrybuty JSX
- `Błąd: ${err.//message}` w interpolacji stringów
- `var(--border-//border-radius)` — podwójny slash w CSS

### Redirect loop w autoryzacji
- Callback OAuth wrzucał dane sesji do URL hash (`/dashboard#sesja`)
- Ale `DashboardLayout` sprawdzał tylko `localStorage` (puste)
- Efekt: logowanie → dashboard → brak sesji → home → logowanie → ∞

### Wywalone API routes
- Usunął kluczowe pliki z `panel/app/api/`: `health/route.js`, `status/route.js`, `db/route.js`
- Panel nie miał "mostu" do komunikacji z botem na porcie 3001
- Proxy `[...path]/route.js` nie działało bo brakowało endpointów

### Halucynacje
- Wmawiał użytkownikowi że kod nie działa przez "spacje na końcu stringów CSS"
- Twierdził że są "zepsute operatory" (np. że zamiast `===` jest `== =`)
- Nawet po przyznaniu się do halucynacji, wracał do tego samego wątku
- Zamiast poprosić o logi z konsoli — zgadywał przyczyny błędów

### Brak znajomości Next.js
- Zwracał gołe `<div>` jako root layout (App Router wymaga `<html>` i `<body>`)
- Nie ogarniał hydration mismatch

### Problemy z logiką
- Ładował moduły przed połączeniem z bazą danych (moduły potrzebowały DB)
- `initDbStructure()` wywoływane tylko po udanym `connectDB()` — ale warunek był odwrotny

---

## Co zostało z Qwena (już naprawione)

Wszystkie błędy Qwena zostały naprawione przez kolejnych agentów:
- Podwójne slashe → poprawione
- Skorodowane className → poprawione
- Redirect loop → naprawiony (session w localStorage)
- API routes → przywrócone przez proxy
- Kolejność startu → DB przed modułami
