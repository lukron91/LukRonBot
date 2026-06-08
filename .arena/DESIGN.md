# Dokumentacja projektowa — systemy i wymagania

---

## SYSTEM BANOWANIA (ETAP 3)

### Dwa tryby banowania (do wyboru w panelu per serwer)

Użytkownik chce mieć możliwość wyboru rodzaju bana dla każdego serwera Discord:

#### Tryb 1: Ban Discordowy (standardowy)
- Standardowy ban przez API Discorda
- Wyrzuca użytkownika z serwera
- Użytkownik nie może wejść ponownie bez odbanowania

#### Tryb 2: Ban Rangowy (Shadow/Soft Ban)
- Bot **nie wyrzuca** użytkownika z serwera
- Zamiast tego nadaje specjalną rolę "Baned"
- Rola "Baned" blokuje dostęp do WSZYSTKICH kanałów
- Wyjątek: jeden dedykowany kanał odwołań (konfigurowalny w panelu)
- Użytkownik widzi tylko kanał odwołań, gdzie może złożyć ticket

### Konfiguracja w panelu (per serwer/guild)
- Wybór trybu: Discord ban / Role ban (toggle)
- Wybór roli do nadania przy Role Ban (dropdown z rolami serwera)
- Wybór kanału odwołań (dropdown z kanałami tekstowymi)
- Ustawienia w `guild_configs` w MongoDB

### Jak ma działać odwołanie
- Zbanowany rangowo użytkownik widzi tylko kanał #odwołania
- W kanale odwołań może utworzyć ticket (osobny system)
- Moderatorzy widzą ticket i mogą odbanować lub odrzucić

### Przepływ bana
1. Moderator klika "Ban" na użytkowniku w panelu
2. Jeśli Discord Ban → bot wysyła API Discorda (ban + opcjonalnie usuń wiadomości)
3. Jeśli Role Ban → bot nadaje rolę "Baned", zapisuje poprzednie role użytkownika
4. Wpis do kolekcji `moderation` w MongoDB (kto, kogo, powód, typ, data)
5. Przy odbanowaniu: Discord → unban API; Role → zabiera rolę, przywraca poprzednie

---

## STRUKTURA BAZY DANYCH (MongoDB)

### Kolekcje (wymagane)

```
mongoDB/
├── [BOT_ENV]/              ← test lub main (zależnie od .env)
│   ├── global_configs      ← ustawienia globalne bota
│   ├── guild_configs       ← ustawienia per serwer Discord
│   │   ├── guildId
│   │   ├── banMode: "discord" | "role"
│   │   ├── banRoleId: string
│   │   ├── appealChannelId: string
│   │   ├── muteRoleId: string
│   │   ├── autoModEnabled: boolean
│   │   ├── blockLinks: boolean
│   │   ├── blockInvites: boolean
│   │   └── ...inne ustawienia
│   ├── activities           ← logi aktywności (zoptymalizowane, indeksowane)
│   ├── moderation           ← historia wszystkich kar
│   │   ├── userId
│   │   ├── guildId
│   │   ├── type: "warn" | "mute" | "ban" | "unban" | "unmute"
│   │   ├── banType: "discord" | "role"  ← tylko dla ban/unban
│   │   ├── reason: string
│   │   ├── moderatorId: string
│   │   ├── date: Date
│   │   ├── expires: Date?   ← dla mute z wygasaniem
│   │   └── active: boolean
│   └── tickets              ← system ticketów (przyszły)
```

### Wymaganie: initDbStructure()
Przy starcie bota, PO udanym connectDB(), funkcja `initDbStructure()` MUSI:
1. Utworzyć kolekcje jeśli nie istnieją
2. Założyć indeksy (np. `guild_configs.guildId` unique, `moderation.userId+guildId`)
3. Wstawić domyślne wartości do `global_configs` jeśli puste
4. **Nie czekać na dane z modułów** — struktura ma być widoczna od razu w MongoDB Atlas

---

## SYSTEM LOGOWANIA I SESJI

### Flow autoryzacji
1. Użytkownik klika "Zaloguj przez Discord" → przekierowanie do Discord OAuth
2. Discord callback → `callback/route.js` odbiera token
3. Token → dane użytkownika + gildie → zapis do `localStorage` jako `session`
4. `DashboardLayout` sprawdza `localStorage.getItem("session")`
5. Jeśli brak sesji → redirect na `/` (strona logowania)

### Dane sesji w localStorage
```json
{
  "userId": "...",
  "username": "...",
  "avatar": "...",
  "guilds": [{ "id": "...", "name": "...", "icon": "..." }],
  "accessToken": "..."
}
```

---

## SYSTEM MOTYWÓW

### CSS Variables (ustawiane przez ThemeContext na documentElement)
- `--bg-color` — kolor tła strony
- `--surface-rgb` — RGB powierzchni (używane z opacity)
- `--border-color` — kolor obramowań
- `--text-color` — kolor tekstu
- `--text-muted` — przygaszony tekst
- `--accent-color` — kolor akcentu (dynamiczny)
- `--border-radius` — zaokrąglenie rogów
- `--surface-opacity` — przezroczystość paneli (glassmorphism)
- `--bg-intensity` — intensywność tła

### Palety (w theme-context.jsx)
- Dark: `backgroundColor: '#0a0a0f'`, `surfaceRGB: '20, 20, 28'`, `borderColor: '#1e1e26'`
- Light: `backgroundColor: '#f3f4f6'`, `surfaceRGB: '255, 255, 255'`, `borderColor: '#e5e7eb'`

### Persistence
- Zapis w `localStorage` pod kluczem `theme_settings`
- Przywracanie przy ładowaniu strony

---

## SYSTEM RÓL HIERARCHICZNYCH (Panel zarządzania rolami)

Ostatnia aktualizacja: 2026-06-08

### Kontekst — co robią inne boty

Popularne boty (YAGPDB, Carl-bot) oferują "role groups" — grupy ról które użytkownik może sobie samodzielnie przypisać.
YAGPDB nazywa to "Role Commands" z kategoriami (np. "Wiek", "Kraj") i trybami Single/Multiple.

**Nasz system jest inny i bardziej zaawansowany** — nie chodzi o samodzielne przypisywanie przez użytkownika,
ale o zarządzanie administracyjne z automatyzacją po stronie bota.

---

### Trzy typy ról w systemie

#### Typ 1: Rola standardowa (zwykła)
- Tworzona przez "Dodaj rolę" w panelu
- Ma pełne uprawnienia (konfigurowane w edytorze)
- Nie należy do żadnej grupy
- Zachowuje się jak normalna rola Discord

#### Typ 2: Rola nadrzędna (rola-kategoria / parent)
- Tworzona przez "Dodaj rolę nadrzędną"
- **Pusta** — nie ma uprawnień (bo uprawnienia wynikają z ról podrzędnych)
- Ma tylko: nazwa + kolor
- Służy jako etykieta/kategoria grupująca role podrzędne
- W panelu wyświetlana jako **rozwijana zakładka** z listą swoich ról podrzędnych
- Użytkownik może mieć wiele ról z jednej grupy LUB tylko jedną — konfigurowalny tryb

#### Typ 3: Rola podrzędna (child)
- Tworzona wewnątrz roli nadrzędnej przez "Dodaj rolę podrzędną"
- Ma normalne uprawnienia (konfigurowane tak jak rola standardowa)
- Powiązana z konkretną rolą nadrzędną (relacja w bazie)

---

### Automat bota — kluczowa funkcja

**Zasada:** Jeśli użytkownik dostanie rolę podrzędną (ręcznie na Discordzie lub przez panel),
bot automatycznie nadaje mu też rolę nadrzędną.

**Dlaczego:** Rola nadrzędna służy jako "kategoria" na liście członków Discorda.
Gdy ktoś ma rolę "Moderator PL" (podrzędna), powinien też mieć "Moderacja" (nadrzędna)
żeby był widoczny w tej sekcji na liście członków.

**Implementacja:**
- Bot nasłuchuje eventu `guildMemberUpdate`
- Sprawdza czy dodana rola jest rolą podrzędną (lookup w bazie)
- Jeśli tak → automatycznie nadaje powiązaną rolę nadrzędną
- Odwrotnie: jeśli użytkownik traci WSZYSTKIE role podrzędne danej grupy → bot odbiera rolę nadrzędną

---

### Dane w bazie MongoDB (kolekcja: role_groups)

```js
{
  guildId: String,           // ID serwera
  parentRoleId: String,      // ID roli nadrzędnej na Discordzie
  parentRoleName: String,    // nazwa (cache dla panelu)
  mode: String,              // 'multiple' | 'single' (czy użytkownik może mieć wiele z tej grupy)
  childRoles: [
    {
      roleId: String,        // ID roli podrzędnej na Discordzie
      roleName: String,      // nazwa (cache)
    }
  ],
  createdAt: Date,
}
```

---

### UI panelu — plan

**Lista ról (lewa kolumna) — nowe elementy:**

```
[+ Dodaj rolę standardową]   [+ Dodaj rolę nadrzędną]

● Admin (rola standardowa)
● Moderator (rola standardowa)

▼ MODERACJA (rola nadrzędna, rozwijalna)
  ├── Moderator PL (podrzędna)
  ├── Moderator EN (podrzędna)
  └── [+ Dodaj rolę podrzędną]

▼ KRAJE (rola nadrzędna)
  ├── Polska
  ├── Anglia
  └── [+ Dodaj rolę podrzędną]
```

**Edytor roli nadrzędnej (prawa kolumna):**
- Tylko: nazwa, kolor
- Tryb: Single (użytkownik może mieć tylko 1 podrzędną) / Multiple (wiele)
- Lista podrzędnych z możliwością usunięcia powiązania

**Edytor roli podrzędnej:**
- Pełny edytor jak rola standardowa (nazwa, kolor, uprawnienia)
- Widoczne przypisanie do nadrzędnej

---

### Co wymaga bazy danych

- Kolekcja `role_groups` — powiązania parent-child
- Odczyt przy starcie bota (cache w pamięci dla szybkiego lookupu w `guildMemberUpdate`)
- Zapis przy tworzeniu/usuwaniu grupy przez panel
- Przy usunięciu roli z Discorda → bot czyści wpis z bazy

### Co NIE wymaga bazy (działa przez Discord API)

- Samo tworzenie/edycja/usuwanie ról na Discordzie
- Nadawanie/odbieranie ról użytkownikom
- Pobieranie listy ról i członków

### Kolejność implementacji

1. Baza (`role_groups` kolekcja) — ETAP wymagający działającej bazy
2. Endpoint `GET/POST /api/guilds/:id/role-groups` — CRUD dla grup
3. Bot: listener `guildMemberUpdate` → auto-assign logika
4. Panel: rozwijane zakładki dla ról nadrzędnych, przyciski tworzenia, edytor
