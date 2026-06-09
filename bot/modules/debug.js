const { getDb, BOT_ENV } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Moduł testowy i debug');
  const logger = app.locals.logger;

  // Prosty test czy moduł działa
  app.get('/debug/test', (req, res) => {
    res.json({ success: true, message: 'Test OK: moduł debug działa', env: BOT_ENV });
  });

  // Test zapisu do bazy — zapisuje do global_config żeby zobaczyć log DB
  app.post('/api/db/test-write', async (req, res) => {
    try {
      const db = getDb('global');
      db.prepare(`INSERT INTO global_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
        .run('debug_test_write', 'zapis z panelu: ' + new Date().toISOString());

      logger.activity('info', 'Test zapisu do bazy [' + BOT_ENV + '] — sukces', 'debug');
      res.json({ success: true, environment: BOT_ENV, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.activity('error', 'Test zapisu do bazy — błąd: ' + err.message, 'debug');
      res.status(500).json({ error: err.message });
    }
  });

  logger.system('info', 'Moduł debug załadowany', 'debug');
};
