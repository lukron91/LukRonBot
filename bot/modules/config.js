// bot/modules/config.js
const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule('config', false, 'Zarządzanie ustawieniami serwera: prefiks, język, limit komend, auto-delete, opóźnienia odpowiedzi');

  // ===== SCHEMATY MONGODB =====
  const GlobalConfigSchema = new mongoose.Schema({
    environment: { type: String, required: true, enum: ['main', 'test'] },
    status: { type: String, default: 'online', enum: ['online', 'idle', 'dnd', 'invisible'] },
    customStatus: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now }
  });

  const ServerConfigSchema = new mongoose.Schema({
    environment: { type: String, required: true, enum: ['main', 'test'] },
    guildId: { type: String, required: true },
    module: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastUpdated: { type: Date, default: Date.now }
  });

  const GlobalConfig = mongoose.models.GlobalConfig || mongoose.model('GlobalConfig', GlobalConfigSchema);
  const ServerConfig = mongoose.models.ServerConfig || mongoose.model('ServerConfig', ServerConfigSchema);

  // ===== FUNKCJE POMOCNICZE =====
  
  // Pobierz aktywne środowisko
  const getActiveEnv = () => app.locals.activeDatabase ? app.locals.activeDatabase() : 'main';

  // Pobierz globalną konfigurację bota (status, customStatus)
  const getGlobalConfig = async () => {
    try {
      const env = getActiveEnv();
      let config = await GlobalConfig.findOne({ environment: env });
      if (!config) {
        config = await GlobalConfig.create({ 
          environment: env,
          status: 'online',
          customStatus: ''
        });
      }
      return config;
    } catch (error) {
      console.error('[Config] Błąd pobierania globalnej konfiguracji:', error);
      return { status: 'online', customStatus: '' };
    }
  };

  // Zaktualizuj globalną konfigurację
  const updateGlobalConfig = async (data) => {
    try {
      const env = getActiveEnv();
      const config = await GlobalConfig.findOneAndUpdate(
        { environment: env },
        { $set: { ...data, lastUpdated: Date.now() } },
        { new: true, upsert: true }
      );
      return config;
    } catch (error) {
      console.error('[Config] Błąd aktualizacji globalnej konfiguracji:', error);
      return null;
    }
  };

  // Pobierz konfigurację serwera dla konkretnego modułu
  const getServerConfig = async (guildId, module) => {
    try {
      const env = getActiveEnv();
      let config = await ServerConfig.findOne({ environment: env, guildId, module });
      if (!config) {
        // Utwórz domyślną konfigurację dla modułu
        const defaultData = getDefaultConfig(module);
        config = await ServerConfig.create({ 
          environment: env,
          guildId,
          module,
          data: defaultData
        });
      }
      return config.data;
    } catch (error) {
      console.error('[Config] Błąd pobierania konfiguracji serwera:', error);
      return getDefaultConfig(module);
    }
  };

  // Zaktualizuj konfigurację serwera dla konkretnego modułu
  const updateServerConfig = async (guildId, module, data) => {
    try {
      const env = getActiveEnv();
      const config = await ServerConfig.findOneAndUpdate(
        { environment: env, guildId, module },
        { $set: { data, lastUpdated: Date.now() } },
        { new: true, upsert: true }
      );
      return config.data;
    } catch (error) {
      console.error('[Config] Błąd aktualizacji konfiguracji serwera:', error);
      return null;
    }
  };

  // Domyślne konfiguracje dla modułów
  const getDefaultConfig = (module) => {
    const defaults = {
      config: {
        prefix: '!',
        language: 'pl',
        timezone: 'Europe/Warsaw',
        commandLimit: 10,
        autoDeleteCommands: false,
        responseDelay: 500
      },
      moderation: {
        autoModEnabled: false,
        banMethod: 'discord',
        banRoleId: null,
        blockInvites: false,
        blockLinks: false,
        modLogChannel: null,
        warnThreshold: 3,
        welcomeEnabled: false
      },
      commands: {},
      tickets: {},
      automod: {},
      welcome: {},
      logs: {}
    };
    return defaults[module] || {};
  };

  // ===== ENDPOINTY API =====

  // Pobierz globalną konfigurację (status bota)
  app.get('/api/bot/config', async (req, res) => {
    try {
      const config = await getGlobalConfig();
      res.json({
        environment: getActiveEnv(),
        status: config.status,
        customStatus: config.customStatus
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Zaktualizuj globalną konfigurację
  app.post('/api/bot/config', async (req, res) => {
    try {
      const { status, customStatus } = req.body;
      const config = await updateGlobalConfig({ status, customStatus });
      if (config) {
        // Zaktualizuj status bota na Discordzie
        const presenceData = { status: config.status };
        if (config.customStatus && config.customStatus.trim() !== '') {
          presenceData.activities = [{ name: config.customStatus, type: 'Custom' }];
        }
        try {
          await client.user.setPresence(presenceData);
        } catch (err) {
          console.error('[Config] Błąd aktualizacji statusu Discord:', err);
        }
        res.json({ success: true, config });
      } else {
        res.status(500).json({ error: 'Nie udało się zaktualizować konfiguracji' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pobierz konfigurację serwera dla modułu
  app.get('/api/guilds/:guildId/config/:module', async (req, res) => {
    try {
      const { guildId, module } = req.params;
      const config = await getServerConfig(guildId, module);
      res.json({ environment: getActiveEnv(), guildId, module, config });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Zaktualizuj konfigurację serwera dla modułu
  app.post('/api/guilds/:guildId/config/:module', async (req, res) => {
    try {
      const { guildId, module } = req.params;
      const data = req.body;
      const config = await updateServerConfig(guildId, module, data);
      if (config) {
        res.json({ success: true, environment: getActiveEnv(), guildId, module, config });
      } else {
        res.status(500).json({ error: 'Nie udało się zaktualizować konfiguracji' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== UDOSTĘPNIJ FUNKCJE DLA INNYCH MODUŁÓW =====
  app.locals.getGlobalConfig = getGlobalConfig;
  app.locals.updateGlobalConfig = updateGlobalConfig;
  app.locals.getServerConfig = getServerConfig;
  app.locals.updateServerConfig = updateServerConfig;
  app.locals.getDefaultConfig = getDefaultConfig;

  console.log('[Config] Moduł konfiguracji załadowany, endpointy gotowe');
};