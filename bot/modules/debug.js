const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Moduł testowy i debug');

  const logger = app.locals.logger;

  app.get('/debug/test', (req, res) => {
    res.json({ success: true, message: 'Test OK: moduł debug działa' });
  });

  app.post('/api/db/test-write', async (req, res) => {
    const { targetEnv } = req.body;

    if (!['main', 'test'].includes(targetEnv)) {
      return res.status(400).json({ error: 'Nieprawidłowe środowisko. Dozwolone: main, test' });
    }

    try {
      const collectionName = `${targetEnv}_config`;
      const TestSchema = new mongoose.Schema({
        key: String,
        value: mongoose.Schema.Types.Mixed,
        updatedAt: Date
      });
      const TestModel = mongoose.models[collectionName]
        || mongoose.model(collectionName, TestSchema, collectionName);

      await TestModel.findOneAndUpdate(
        { key: 'test_write' },
        { key: 'test_write', value: `zapis z panelu: ${new Date().toISOString()}`, updatedAt: new Date() },
        { upsert: true }
      );

      logger.activity('info', `Test zapisu do środowiska ${targetEnv} – sukces`, 'debug');
      res.json({ success: true, environment: targetEnv, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.activity('error', `Test zapisu do ${targetEnv} – błąd: ${err.message}`, 'debug');
      res.status(500).json({ error: err.message });
    }
  });

  logger.system('info', 'Moduł debug załadowany', 'debug');
};