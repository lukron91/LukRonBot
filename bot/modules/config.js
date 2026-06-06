// bot/modules/config.js
const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule('config', false, 'Zarządzanie ustawieniami serwera: prefiks, język, limit komend, auto-delete, opóźnienia odpowiedzi');

  // ===== SCHEMAT MONGODB DLA KONFIGURACJI =====
  const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'pl', enum: ['pl', 'en', 'de'] },
    timezone: { type: String, default: 'Europe/Warsaw' },
    commandLimit: { type: Number, default: 10, min: 1, max: 100 },
    autoDeleteCommands: { type: Boolean, default: false },
    responseDelay: { type: Number, default: 500, min: 0, max: 5000 }
  });

  const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig', GuildConfigSchema);

  // ===== POBIERANIE KONFIGURACJI SERWERA =====
  app.get('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const { guildId } = req.params;
      
      let config = await GuildConfig.findOne({ guildId });
      
      if (!config) {
        // Jeśli nie ma konfiguracji, tworzymy domyślną
        config = await GuildConfig.create({ 
          guildId, 
          prefix: '!', 
          language: 'pl', 
          timezone: 'Europe/Warsaw',
          commandLimit: 10,
          autoDeleteCommands: false,
          responseDelay: 500
        });
      }
      
      res.json({
        guildId: config.guildId,
        prefix: config.prefix,
        language: config.language,
        timezone: config.timezone,
        commandLimit: config.commandLimit,
        autoDeleteCommands: config.autoDeleteCommands,
        responseDelay: config.responseDelay
      });
    } catch (error) {
      console.error('[Config] Błąd pobierania konfiguracji:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== AKTUALIZACJA KONFIGURACJI SERWERA =====
  app.post('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { prefix, language, timezone, commandLimit, autoDeleteCommands, responseDelay } = req.body;

      const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        {
          $set: {
            prefix: prefix || '!',
            language: language || 'pl',
            timezone: timezone || 'Europe/Warsaw',
            commandLimit: commandLimit ?? 10,
            autoDeleteCommands: autoDeleteCommands || false,
            responseDelay: responseDelay ?? 500
          }
        },
        { new: true, upsert: true }
      );

      res.json({ 
        success: true, 
        config: {
          guildId: config.guildId,
          prefix: config.prefix,
          language: config.language,
          timezone: config.timezone,
          commandLimit: config.commandLimit,
          autoDeleteCommands: config.autoDeleteCommands,
          responseDelay: config.responseDelay
        }
      });
    } catch (error) {
      console.error('[Config] Błąd aktualizacji konfiguracji:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FUNKCJA POMOCNICZA: POBIERZ KONFIGURACJĘ (dla innych modułów) =====
  const getGuildConfig = async (guildId) => {
    try {
      let config = await GuildConfig.findOne({ guildId });
      if (!config) {
        config = await GuildConfig.create({ 
          guildId, 
          prefix: '!', 
          language: 'pl', 
          timezone: 'Europe/Warsaw',
          commandLimit: 10,
          autoDeleteCommands: false,
          responseDelay: 500
        });
      }
      return config;
    } catch (error) {
      console.error('[Config] Błąd pobierania konfiguracji:', error);
      return null;
    }
  };

  // Udostępnij funkcję pomocniczą dla innych modułów
  app.locals.getGuildConfig = getGuildConfig;

  console.log('[Config] Moduł konfiguracji załadowany, endpointy gotowe');
};