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
