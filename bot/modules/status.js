const { ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '..', 'status.json');

function saveBotStatus(status, customStatus) {
  const data = { status, customStatus: customStatus || '' };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
}

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName);
  const logger = app.locals?.logger || console;

  app.post('/bot/status', async (req, res) => {
    const { status, customText } = req.body;
    if (status && !['online', 'idle', 'dnd', 'invisible'].includes(status)) {
      logger.warn(`Nieprawidłowy status: ${status}`);
      return res.status(400).json({ error: 'Invalid status' });
    }
    try {
      const presenceData = {};
      if (status) presenceData.status = status;
      let newCustomText = customText;
      if (customText !== undefined) {
        if (customText && customText.trim() !== '') {
          presenceData.activities = [{ name: customText, type: ActivityType.Custom }];
          logger.info(`Ustawiono custom status: ${customText}`);
        } else {
          presenceData.activities = [];
          newCustomText = '';
        }
      }
      await client.user.setPresence(presenceData);
      saveBotStatus(status || client.user?.presence?.status, newCustomText);
      res.json({ success: true, status: status || client.user?.presence?.status, customText: newCustomText });
      logger.info(`Status bota zmieniony na ${status || 'online'}`);
    } catch (err) {
      logger.error(`Błąd zmiany statusu: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });
};

module.exports.description = `Moduł zmiany statusu bota – pozwala ustawić status online/idle/dnd/invisible oraz niestandardowy tekst. Ustawienia są zapisywane w pliku status.json i przywracane po restarcie.`;