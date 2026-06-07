const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Konfiguracja serwerów Discord');

  const logger = app.locals.logger;
  const col = app.locals.dbCollection;

  const ServerConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'pl', enum: ['pl', 'en', 'de'] },
    commandLimit: { type: Number, default: 10, min: 1, max: 100 },
    autoDeleteCommands: { type: Boolean, default: false },
    responseDelay: { type: Number, default: 0, min: 0, max: 5000 },
    autoModEnabled: { type: Boolean, default: false },
    blockLinks: { type: Boolean, default: false },
    blockInvites: { type: Boolean, default: false },
    warnThreshold: { type: Number, default: 3 },
    banMethod: { type: String, default: 'discord', enum: ['discord', 'role'] },
    banRoleId: { type: String, default: null },
    modLogChannel: { type: String, default: null },
    logEnabled: { type: Boolean, default: false },
    welcomeEnabled: { type: Boolean, default: false },
  }, { timestamps: true, collection: col('serverconfigs') });

  const ServerConfig = mongoose.models[col('serverconfigs')]
    || mongoose.model(col('serverconfigs'), ServerConfigSchema);

  const getGuildConfig = async (guildId) => {
    try {
      let config = await ServerConfig.findOne({ guildId });
      if (!config) {
        logger.activity('warn', `Brak konfiguracji dla serwera ${guildId} – tworzę domyślną`, 'config');
        config = await ServerConfig.create({ guildId });
      }
      return config;
    } catch (err) {
      logger.activity('error', `Błąd odczytu konfiguracji serwera ${guildId}: ${err.message}`, 'config');
      return null;
    }
  };

  const updateGuildConfig = async (guildId, updates) => {
    try {
      const config = await ServerConfig.findOneAndUpdate(
        { guildId },
        { ...updates },
        { upsert: true, new: true }
      );
      logger.activity('info', `Konfiguracja serwera ${guildId} zaktualizowana: ${Object.keys(updates).join(', ')}`, 'config');
      return config;
    } catch (err) {
      logger.activity('error', `Błąd zapisu konfiguracji serwera ${guildId}: ${err.message}`, 'config');
      return null;
    }
  };

  app.get('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const config = await getGuildConfig(req.params.guildId);
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const config = await updateGuildConfig(req.params.guildId, req.body);
      if (config) {
        logger.activity('info', `[API] Konfiguracja serwera ${req.params.guildId} zapisana przez panel`, 'config');
        res.json({ success: true, config });
      } else {
        res.status(500).json({ error: 'Błąd zapisu' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.locals.getGuildConfig = getGuildConfig;
  app.locals.updateGuildConfig = updateGuildConfig;

  logger.system('info', 'Moduł config załadowany', 'config');
};