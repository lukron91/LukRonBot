# Discord Bot — Instrukcja instalacji

## Wymagania
- Konto na [Railway](https://railway.app)
- Konto na [GitHub](https://github.com)
- [Git](https://git-scm.com/downloads) zainstalowany na komputerze

---

## Krok 1 — Przygotuj repozytorium GitHub

1. Wejdź na **github.com** → kliknij **+** → **New repository**
2. Nazwij repo np. `discord-bot`, ustaw jako **Private**, kliknij **Create**
3. Na swoim komputerze otwórz folder z botiem w terminalu (cmd/PowerShell):

```bash
git init
git add .
git commit -m "Pierwsza wersja"
git remote add origin https://github.com/TWOJ_NICK/discord-bot.git
git push -u origin main
```

---

## Krok 2 — Deploy na Railway

1. Wejdź na **railway.app** → zaloguj się przez GitHub
2. Kliknij **New Project** → **Deploy from GitHub repo**
3. Wybierz swoje repozytorium `discord-bot`
4. Railway automatycznie wykryje projekt Node.js i zacznie budować

---

## Krok 3 — Zmienne środowiskowe na Railway

W panelu Railway → Twój projekt → zakładka **Variables** dodaj:

| Nazwa | Wartość |
|-------|---------|
| `BOT_TOKEN` | Token bota z Discord Developer Portal |
| `CLIENT_ID` | ID aplikacji Discord |
| `CLIENT_SECRET` | Tajny klucz klienta Discord |
| `GUILD_ID` | ID serwera Discord |
| `SESSION_SECRET` | Dowolny długi losowy ciąg znaków |
| `PANEL_URL` | URL panelu (patrz krok 4) |
| `PANEL_PORT` | `3000` |
| `ADMIN_ROLE_IDS` | (zostaw puste na razie) |

---

## Krok 4 — Publiczny URL panelu

1. W Railway → Twój projekt → zakładka **Settings** → **Networking**
2. Kliknij **Generate Domain** — Railway da Ci adres np. `discord-bot-production.up.railway.app`
3. Skopiuj ten adres i wstaw go jako wartość `PANEL_URL` w Variables
4. Zrób redeploy (Railway → Deploy → Redeploy)

---

## Krok 5 — Callback URL w Discord

1. Wejdź na **discord.com/developers/applications** → Twoja aplikacja
2. Zakładka **OAuth2** → **Redirects**
3. Kliknij **Add Redirect** i wpisz:
   ```
   https://TWOJ_URL.up.railway.app/auth/callback
   ```
4. Zapisz zmiany

---

## Krok 6 — Dodaj bota do serwera

1. Discord Developer Portal → Twoja aplikacja → **OAuth2** → **URL Generator**
2. Zaznacz scope: `bot`, `applications.commands`
3. Zaznacz uprawnienia: `Administrator` (lub wybierz konkretne)
4. Skopiuj wygenerowany URL i otwórz w przeglądarce
5. Wybierz swój serwer testowy i kliknij **Autoryzuj**

---

## Krok 7 — Gotowe!

- Panel webowy: `https://TWOJ_URL.up.railway.app`
- Zaloguj się przez Discord
- Komendy bota: `/ping`, `/ban`, `/kick`, `/mute`, `/clear`

---

## Aktualizacje

Gdy dostaniesz nowy plik .zip z aktualizacją:
1. Zaloguj się do panelu
2. Zakładka **Aktualizacje**
3. Wgraj plik .zip
4. Bot automatycznie wykona kopię zapasową i zainstaluje aktualizację

Jeśli coś pójdzie nie tak — w tej samej zakładce możesz przywrócić poprzednią wersję.

---

## Lokalne testowanie (opcjonalnie)

```bash
npm install
node src/index.js        # uruchom bota
node panel/server.js     # uruchom panel
```

Panel będzie dostępny na `http://localhost:3000`
