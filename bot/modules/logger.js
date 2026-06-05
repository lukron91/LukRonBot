const fs = require('fs');
const path = require('path');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName);

  const LOG_DIR = path.join(__dirname, '..', 'logs');
  const SYSTEM_LOG_FILE = path.join(LOG_DIR, 'system.log');
  const ACTIVITY_LOG_FILE = path.join(LOG_DIR, 'activity.log');
  const MAX_LOGS = 1000;

  let systemLogs = [];
  let activityLogs = [];

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  // Zachowaj oryginalne funkcje konsoli, aby uniknąć rekurencji
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  function writeLog(type, message, category = 'system', source = 'core') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, category, source, message };
    if (category === 'system') {
      systemLogs.unshift(logEntry);
      if (systemLogs.length > MAX_LOGS) systemLogs.pop();
      fs.appendFile(SYSTEM_LOG_FILE, `[${timestamp}] [${type.toUpperCase()}] [${source}] ${message}\n`, (err) => {
        if (err) originalConsoleError('Błąd zapisu logu systemowego:', err);
      });
    } else {
      activityLogs.unshift(logEntry);
      if (activityLogs.length > MAX_LOGS) activityLogs.pop();
      fs.appendFile(ACTIVITY_LOG_FILE, `[${timestamp}] [${type.toUpperCase()}] [${category}] [${source}] ${message}\n`, (err) => {
        if (err) originalConsoleError('Błąd zapisu logu aktywności:', err);
      });
    }
    // Wyświetl w konsoli z kolorami (używając oryginalnego console.log)
    let color = '';
    if (type === 'error') color = '\x1b[31m';
    else if (type === 'warn') color = '\x1b[33m';
    else if (type === 'info') color = '\x1b[37m';
    else color = '\x1b[90m';
    originalConsoleLog(`${color}[${timestamp}] [${type.toUpperCase()}] [${category}] [${source}] ${message}\x1b[0m`);
  }

  // Nadpisz console.log i console.error, aby trafiały do logów systemowych
  console.log = (...args) => writeLog('info', args.join(' '), 'system', 'console');
  console.error = (...args) => writeLog('error', args.join(' '), 'system', 'console');

  // Endpointy API
  app.get('/api/logs/system', (req, res) => {
    res.json(systemLogs);
  });
  app.get('/api/logs/activity', (req, res) => {
    res.json(activityLogs);
  });

  const logger = {
    system: (type, message, source = 'core') => writeLog(type, message, 'system', source),
    activity: (type, message, source = 'core') => writeLog(type, message, 'activity', source),
    info: (msg, source) => writeLog('info', msg, 'activity', source),
    warn: (msg, source) => writeLog('warn', msg, 'activity', source),
    error: (msg, source) => writeLog('error', msg, 'activity', source),
    debug: (msg, source) => writeLog('debug', msg, 'activity', source),
  };

  app.locals.logger = logger;
  logger.activity('info', 'Moduł logger załadowany', 'logger');
  originalConsoleLog('[logger] Moduł logowania aktywny (system i activity)');
};

module.exports.description = `Moduł logowania systemowego i aktywności – przechwytuje wszystkie logi, zapisuje je do plików i udostępnia przez API /api/logs/system oraz /api/logs/activity.`;