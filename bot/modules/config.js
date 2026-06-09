const { getDb } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Konfiguracja serwerów Discord');
  const logger = app.locals.logger;

  const getGuildConfig = async (guildId) => {
    try {
      const db = getDb(guildId);
      let config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
      if (!config) {
        logger.activity('warn', 'Brak konfiguracji serwera ' + guildId + ' — tworzę domyślną', 'config');
        db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(guildId);
        config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
      }
      return config;
    } catch (err) {
      logger.activity('error', 'Błąd odczytu konfiguracji ' + guildId + ': ' + err.message, 'config');
      return null;
    }
  };

  const updateGuildConfig = async (guildId, updates) => {
    try {
      const db = getDb(guildId);
      const allowed = ['prefix', 'language', 'timezone', 'command_limit', 'auto_delete_cmds', 'response_delay'];
      const sets = [];
      const vals = [];
      for (const [key, val] of Object.entries(updates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowed.includes(dbKey)) {
          sets.push(`"${dbKey}" = ?`);
          vals.push(val);
        }
      }
      if (sets.length === 0) return null;
      sets.push('updated_at = datetime(\'now\')');
      vals.push(guildId);
      db.prepare(`UPDATE guild_config SET ${sets.join(', ')} WHERE guild_id = ?`).run(...vals);
      logger.activity('info', 'Konfiguracja ' + guildId + ' zaktualizowana: ' + Object.keys(updates).join(', '), 'config');
      return db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
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
      const db = getDb(req.params.guildId);
      const allowed = ['ban_type', 'ban_role_id', 'appeal_channel_id', 'mod_log_channel',
        'auto_mod_enabled', 'block_links', 'block_invites', 'warn_threshold', 'mute_role_id',
        'command_permissions', 'command_enabled'];
      const sets = [];
      const vals = [];
      for (const [key, val] of Object.entries(req.body)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowed.includes(dbKey)) {
          sets.push(`"${dbKey}" = ?`);
          vals.push(typeof val === 'object' ? JSON.stringify(val) : val);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'Brak poprawnych pól' });
      sets.push('updated_at = datetime(\'now\')');
      vals.push(req.params.guildId);
      db.prepare(`INSERT INTO moderation_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING`).run(req.params.guildId);
      db.prepare(`UPDATE moderation_settings SET ${sets.join(', ')} WHERE guild_id = ?`).run(...vals);
      const settings = db.prepare('SELECT * FROM moderation_settings WHERE guild_id = ?').get(req.params.guildId);
      res.json({ success: true, settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.locals.getGuildConfig = getGuildConfig;
  app.locals.updateGuildConfig = updateGuildConfig;

  logger.system('info', 'Moduł config załadowany', 'config');
};
