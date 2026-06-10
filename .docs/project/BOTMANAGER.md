# Bot Manager — Dokumentacja

## Opis

Bot Manager to prosty serwer Express do zarządzania procesami bota i panelu. Uruchamiany przez `manager.bat`.

## Uruchomienie

```bash
manager.bat
# lub bezpośrednio:
node botmanager/server.js
```

Serwer działa na porcie **3002**.

## Interfejs

Webowy interfejs dostępny pod `http://localhost:3002` — plik `botmanager/public/index.html`.

## Endpointy API

### Bot
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/bot/status` | Status bota (running/uptime) |
| POST | `/bot/start` | Uruchom bota |
| POST | `/bot/stop` | Zatrzymaj bota |
| POST | `/bot/restart` | Restart bota |
| GET | `/bot/logs` | Logi bota |

### Panel
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/panel/status` | Status panelu (running/uptime) |
| POST | `/panel/start` | Uruchom panel |
| POST | `/panel/stop` | Zatrzymaj panel |
| POST | `/panel/restart` | Restart panelu |
| GET | `/panel/logs` | Logi panelu |

## Działanie

- Uruchamia `node bot/index.js` dla bota
- Uruchamia `npx next dev -p 3000` dla panelu
- Zbiera stdout/stderr do bufora (max 500 linii)
- Na Windows używa `taskkill` do zabijania procesów
