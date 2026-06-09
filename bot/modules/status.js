const { ActivityType } = require('discord.js');
const { getDb } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Status bota — zapisywany w bazie, przywracany przy restarcie');
  const logger = app.locals.logger;

  // Używamy global_config z pierwszej dostępnej bazy (lub tworzymy dedykowaną)
  // Dla ustawień globalnych używamy boty o guildId = 'global'
  function getGlobalDb() {
    return getDb('global');
  }

  async function getConfig(key) {
    try {
      const db = getGlobalDb();
      const row = db.prepare('SELECT value FROM global_config WHERE key = ?').get(key);
      return row ? JSON.parse(row.value) : null;
    } catch { return null; }
  }

  async function setConfig(key, value) {
    try {
      const db = getGlobalDb();
      db.prepare(`INSERT INTO global_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
        .run(key, JSON.stringify(value));
    } catch (err) {
      logger.db('error', 'Błąd zapisu global_config [' + key + ']: ' + err.message);
    }
  }

  // Przywróć status przy starcie bota
  client.once('ready', async () => {
    logger.system('info', 'Bot zalogowany jako ' + client.user.tag, 'status');

    const status     = await getConfig('bot_status')     || 'online';
    const customText = await getConfig('custom_status')  || '';

    const presenceData = { status };
    if (customText.trim()) {
      presenceData.activities = [{ name: customText, type: ActivityType.Custom }];
    }
    try {
      await client.user.setPresence(presenceData);
      logger.system('info', 'Przywrócono status: ' + status + (customText ? ' | ' + customText : ''), 'status');
    } catch (err) {
      logger.system('error', 'Błąd ustawiania statusu: ' + err.message, 'status');
    }
  });

  // Endpoint zmiany statusu
  app.post('/bot/status', async (req, res) => {
    const { status, customText } = req.body;

    if (status && !['online', 'idle', 'dnd', 'invisible'].includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status' });
    }
    try {
      const newStatus     = status || (await getConfig('bot_status')) || 'online';
      const newCustomText = customText !== undefined ? customText : (await getConfig('custom_status')) || '';

      const presenceData = { status: newStatus };
      if (newCustomText.trim()) {
        presenceData.activities = [{ name: newCustomText, type: ActivityType.Custom }];
      } else {
        presenceData.activities = [];
      }

      await client.user.setPresence(presenceData);

      await setConfig('bot_status', newStatus);
      await setConfig('custom_status', newCustomText);

      logger.system('info', 'Status zmieniony: ' + newStatus + (newCustomText ? ' | ' + newCustomText : ''), 'status');
      res.json({ success: true, status: newStatus, customText: newCustomText });
    } catch (err) {
      logger.system('error', 'Błąd zmiany statusu: ' + err.message, 'status');
      res.status(500).json({ error: err.message });
    }
  });

  // Udostępnij helper dla innych modułów
  app.locals.getGlobalConfig = getConfig;
  app.locals.setGlobalConfig = setConfig;

  logger.system('info', 'Moduł status załadowany', 'status');
};
