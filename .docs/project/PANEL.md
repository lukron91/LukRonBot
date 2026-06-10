# Panel webowy — Dokumentacja

## Uruchomienie

```bash
cd panel
npm install
npm run dev       # development (port 3000)
npm run build     # produkcja
npm start         # produkcja
```

## Zmienne środowiskowe

Plik `.env.local` w katalogu `panel/`:

```
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
REDIRECT_URI=http://localhost:3000/api/auth/callback
BOT_API_URL=http://localhost:3001
NEXT_PUBLIC_DISCORD_CLIENT_ID=xxx
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
NEXT_PUBLIC_OWNER_ID=xxx
```

## Struktura

```
panel/
├── app/
│   ├── globals.css           # Globalne style + system przycisków
│   ├── layout.jsx            # Root layout + Providers
│   ├── providers.jsx         # ThemeProvider
│   ├── page.jsx              # Strona logowania
│   ├── api/
│   │   ├── auth/             # Discord OAuth
│   │   │   ├── login/route.js
│   │   │   ├── callback/route.js
│   │   │   ├── logout/route.js
│   │   │   └── me/route.js
│   │   └── proxy/[...path]/  # Proxy do bota
│   ├── servers/              # Wybór serwera
│   └── dashboard/            # Panel zarządzania
│       ├── layout.jsx        # Sidebar + baner + statusy
│       ├── page.jsx          # Przegląd (statystyki, trend)
│       ├── config/           # Konfiguracja ogólna
│       ├── bot-settings/     # Ustawienia bota + komendy
│       ├── roles/            # Zarządzanie rolami
│       ├── theme/            # Ustawienia motywu
│       ├── moderation/
│       │   ├── users/        # Lista użytkowników + kary
│       │   └── settings/     # Ustawienia moderacji
│       ├── tickets/          # Placeholder
│       ├── automod/          # Placeholder
│       ├── welcome/          # Placeholder
│       └── logs/             # Placeholder
├── components/
│   ├── Modal.jsx             # Uniwersalny komponent modalny
│   ├── LoadingScreen.jsx     # Ekran ładowania
│   └── Toast.jsx             # Powiadomienia
└── lib/
    └── theme-context.jsx     # System motywów
```

## Strony

| Ścieżka | Opis | Status |
|---------|------|--------|
| `/` | Logowanie przez Discord | ✅ |
| `/servers` | Wybór serwera | ✅ |
| `/dashboard` | Przegląd serwera | ✅ |
| `/dashboard/config` | Konfiguracja ogólna | ✅ |
| `/dashboard/bot-settings` | Ustawienia bota + komendy | ✅ |
| `/dashboard/roles` | Zarządzanie rolami | ✅ |
| `/dashboard/theme` | Ustawienia motywu | ✅ |
| `/dashboard/moderation/users` | Lista użytkowników + kary | ✅ |
| `/dashboard/moderation/settings` | Ustawienia moderacji | ✅ |
| `/dashboard/tickets` | Placeholder | ⏳ |
| `/dashboard/automod` | Placeholder | ⏳ |
| `/dashboard/welcome` | Placeholder | ⏳ |
| `/dashboard/logs` | Placeholder | ⏳ |

## Proxy API

Panel używa `/api/proxy/[...path]` zamiast bezpośrednich URLi do bota:

```js
// ZAMIAST:
fetch('http://localhost:3001/api/guilds/...')

// UŻYWAJ:
fetch('/api/proxy/api/guilds/' + guildId + '/stats')
```

**Uwaga:** Przy SSR nie używaj template literals w fetch — konkatenacja stringów.

## System motywów

### ThemeProvider (`lib/theme-context.jsx`)
- Context React z `useTheme()` hook
- Przechowuje stan w `localStorage` (klucz: `theme_settings`)
- Ustawia CSS variables na `document.documentElement`

### Hook
```js
const { theme, updateTheme, accentColor } = useTheme();
updateTheme({ mode: 'dark', accentColor: '#ff0000' });
```

### Właściwości motywu
| Właściwość | Typ | Domyślnie | Opis |
|-----------|-----|-----------|------|
| `mode` | `'dark' \| 'light'` | `'dark'` | Tryb kolorystyczny |
| `accentColor` | string | `'#3b82f6'` | Kolor akcentu |
| `borderRadius` | string | `'12px'` | Zaokrąglenia |
| `surfaceOpacity` | string | `'0.9'` | Przezroczystość sidebaru |
| `panelOpacity` | string | `'0.85'` | Krycie paneli |
| `tabOpacity` | string | `'0.85'` | Krycie zakładek |
| `windowOpacity` | string | `'0.92'` | Krycie okien/modali |
| `bgIntensity` | string | `'100%'` | Intensywność tła |
| `bgStyle` | string | `'gradient'` | Styl tła |
| `bgPattern` | string | `'none'` | Wzór tła |
| `buttonStyle` | `'filled' \| 'outline'` | `'filled'` | Styl przycisków |

### CSS Variables
| Zmienna | Opis |
|---------|------|
| `--bg-color` | Kolor tła strony |
| `--surface-rgb` | Kolor powierzchni (RGB) |
| `--surface-color` | Kolor powierzchni (rgba) |
| `--border-color` | Kolor ramki |
| `--text-color` | Kolor tekstu |
| `--text-muted` | Kolor przyciemnionego tekstu |
| `--accent-color` | Kolor akcentu |
| `--border-radius` | Zaokrąglenia |
| `--surface-opacity` | Przezroczystość sidebaru |
| `--panel-opacity` | Krycie paneli |
| `--tab-opacity` | Krycie zakładek/sekcji |
| `--window-opacity` | Krycie okien/modali |
| `--bg-intensity` | Intensywność tła |
| `--bg-pattern` | Wzór tła |

### Palety kolorów
- **Dark:** tło `#0a0a0f`, powierzchnia `rgb(20, 20, 28)`, ramka `#1e1e26`
- **Light:** tło `#f3f4f6`, powierzchnia `rgb(255, 255, 255)`, ramka `#e5e7eb`

## System przycisków

Zawsze używaj klas globalnych z `globals.css`:

```jsx
<button className="btn-base btn-standard">Akcja</button>
<button className="btn-base btn-success">Zapisz</button>
<button className="btn-base btn-danger">Usuń</button>
<button className="btn-base btn-warning">Uwaga</button>
<button className="btn-base btn-dnd">Nie przeszkadzać</button>
```

Kontenery: `btn-row`, `btn-row-lg`, `btn-col`, `btn-row-end`

**Zakaz:** `style={{ background: ... }}` na przyciskach, gradientów, hardkodowanych kolorów.

Styl (filled/outline) kontrolowany przez `html.btn-outline-mode`.

## Komponent Modal

```jsx
import Modal from '@/components/Modal';

<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tytuł">
  <p>Treść modala</p>
</Modal>
```

- `z-index: 9999`, `position: fixed`
- Overlay: `rgba(0,0,0,0.55)` z `backdrop-filter: blur(4px)`
- Zamykanie: kliknięcie poza modalem, klawisz Escape
- Blokada scrolla body gdy otwarty

## Autoryzacja

- Logowanie przez Discord OAuth2
- Sesja w `localStorage` jako JSON (klucz: `session`)
- Zawiera: `userId`, `username`, `global_name`, `avatar`, `guilds[]`
- Wylogowanie: `POST /api/auth/logout` + `localStorage.removeItem('session')`
- Widok Admin/User z przełącznikiem w sidebarze
- Filtrowanie po uprawnieniach Discord (Administrator, ManageRoles, itp.)
