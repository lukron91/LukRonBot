const { makeModel, mongoose } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Konfiguracja serwerów Discord');
  const logger = app.locals.logger;

  const GuildConfig = makeModel('guild_config', new mongoose.Schema({
    guildId:            { type: String, required: true, unique: true },
    prefix:             { type: String, default: '!' },
    language:           { type: String, default: 'pl', enum: ['pl', 'en', 'de'] },
    timezone:           { type: String, default: 'Europe/Warsaw' },
    commandLimit:       { type: Number, default: 10, min: 1, max: 100 },
    autoDeleteCommands: { type: Boolean, default: false },
    responseDelay:      { type: Number, default: 0, min: 0, max: 5000 },
  }, { timestamps: true }));

  const getGuildConfig = async (guildId) => {
    try {
      let config = await GuildConfig.findOne({ guildId });
      if (!config) {
        logger.activity('warn', 'Brak konfiguracji serwera ' + guildId + ' — tworzę domyślną', 'config');
        config = await GuildConfig.create({ guildId });
      }
      return config;
    } catch (err) {
      logger.activity('error', 'Błąd odczytu konfiguracji ' + guildId + ': ' + err.message, 'config');
      return null;
    }
  };

  const updateGuildConfig = async (guildId, updates) => {
    try {
      const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { ...updates },
        { upsert: true, new: true }
      );
      logger.activity('info', 'Konfiguracja ' + guildId + ' zaktualizowana: ' + Object.keys(updates).join(', '), 'config');
      return config;
    } catch (err) {
      logger.activity('error', 'Błąd zapisu konfiguracji ' + guildId + ': ' + err.message, 'config');
      return null;
    }
  };

  app.get('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const config = await getGuildConfig(req.params.guildId);
      res.json(config);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const config = await updateGuildConfig(req.params.guildId, req.body);
      if (config) res.json({ success: true, config });
      else res.status(500).json({ error: 'Błąd zapisu' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Endpoint moderacji — ustawienia moderacji per serwer
  app.post('/api/guilds/:guildId/config/moderation', async (req, res) => {
    try {
      const ModerationSettings = mongoose.models.moderation_settings;
      if (!ModerationSettings) return res.status(503).json({ error: 'Moduł moderacji niezaładowany' });
      const settings = await ModerationSettings.findOneAndUpdate(
        { guildId: req.params.guildId },
        { ...req.body },
        { upsert: true, new: true }
      );
      res.json({ success: true, settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.locals.getGuildConfig = getGuildConfig;
  app.locals.updateGuildConfig = updateGuildConfig;

  logger.system('info', 'Moduł config załadowany', 'config');
};
