const { makeModel, mongoose, BOT_ENV } = require('../db');

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
      const GlobalConfig = mongoose.models.global_config;
      if (!GlobalConfig) return res.status(503).json({ error: 'Model global_config nie załadowany' });

      await GlobalConfig.findOneAndUpdate(
        { key: 'debug_test_write' },
        { key: 'debug_test_write', value: 'zapis z panelu: ' + new Date().toISOString(), updatedAt: new Date() },
        { upsert: true }
      );

      logger.activity('info', 'Test zapisu do bazy [' + BOT_ENV + '] — sukces', 'debug');
      res.json({ success: true, environment: BOT_ENV, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.activity('error', 'Test zapisu do bazy — błąd: ' + err.message, 'debug');
      res.status(500).json({ error: err.message });
    }
  });

  logger.system('info', 'Moduł debug załadowany', 'debug');
};
