# LukRonBot

Bot Discord z panelem webowym do zarządzania.

## Struktura projektu

- `bot/` - Kod bota Discord (Node.js + discord.js)
- `panel/` - Panel webowy (do implementacji)
- `database/` - Skrypty bazy danych (do implementacji)

## Instalacja bota

1. Przejdź do folderu `bot/`
2. Skopiuj `.env.example` do `.env` i uzupełnij tokeny
3. Zainstaluj zależności: `npm install`
4. Zarejestruj komendy: `npm run deploy`
5. Uruchom bota: `npm start`

## Hosting

Bot zostanie wdrożony na Render.com z automatycznym deployem z GitHuba.