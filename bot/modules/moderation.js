const { getDb } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'System moderacji i kar');
  const logger = app.locals.logger;

  // ── Helper: dodaj karę ───────────────────────────────────────────────────
  function addPunishment(guildId, data) {
    const db = getDb(guildId);
    const info = db.prepare(`INSERT INTO punishments
      (guild_id, user_id, moderator_id, type, ban_type, reason, duration, expires_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const result = info.run(
      guildId, data.userId, data.moderatorId || 'panel', data.type,
      data.banType || null, data.reason || 'Brak powodu',
      data.duration || null, data.expiresAt || null,
      data.active !== undefined ? (data.active ? 1 : 0) : 1
    );
    return result.lastInsertRowid;
  }

  // ── Endpointy kar ─────────────────────────────────────────────────────────

  app.post('/api/guilds/:guildId/moderation/:action', async (req, res) => {
    const { guildId, action } = req.params;
    if (!['warn', 'mute', 'ban', 'kick'].includes(action))
      return res.status(400).json({ error: 'Nieprawidłowa akcja' });

    const { userId, moderatorId, reason, duration, banType: banMethod, bannedRoleId } = req.body;

    try {
      const punishmentId = addPunishment(guildId, {
        userId,
        moderatorId: moderatorId || 'panel',
        type: action,
        reason: reason || 'Brak powodu',
        duration: action === 'mute' ? duration : null,
        expiresAt: (action === 'mute' && duration) ? new Date(Date.now() + duration * 60000).toISOString() : null,
        banType: action === 'ban' ? banMethod : null,
        active: true,
      });

      // Akcja na Discordzie
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        try {
          if (action === 'ban') {
            if (banMethod === 'role' && bannedRoleId) {
              const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
              if (member) await member.roles.add(bannedRoleId, 'Ban przez panel: ' + reason);
            } else {
              await guild.members.ban(userId, { reason: 'Ban przez panel: ' + reason });
            }
          } else if (action === 'kick') {
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
            if (member) await member.kick('Kick przez panel: ' + reason);
          } else if (action === 'mute') {
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
            if (member && duration) await member.timeout(duration * 60 * 1000, 'Mute przez panel: ' + reason);
          }
        } catch (discordErr) {
          logger.activity('warn', 'Błąd Discord przy ' + action + ': ' + discordErr.message, 'moderation');
        }
      }

      res.json({ success: true, punishmentId });
    } catch (err) {
      logger.activity('error', 'Błąd kary ' + action + ': ' + err.message, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/guilds/:guildId/moderation/unmute', async (req, res) => {
    const { guildId } = req.params;
    const { userId } = req.body;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
        if (member) await member.timeout(null, 'Odciszenie przez panel');
      }
      const db = getDb(guildId);
      db.prepare('UPDATE punishments SET active = 0 WHERE guild_id = ? AND user_id = ? AND type = ? AND active = 1')
        .run(guildId, userId, 'mute');
      addPunishment(guildId, { userId, moderatorId: 'panel', type: 'unmute', reason: 'Odciszenie przez panel', active: false });
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', 'Błąd unmute: ' + err.message, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/guilds/:guildId/moderation/unban', async (req, res) => {
    const { guildId } = req.params;
    const { userId } = req.body;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (guild) await guild.members.unban(userId, 'Odbanowanie przez panel').catch(() => {});
      const db = getDb(guildId);
      db.prepare('UPDATE punishments SET active = 0 WHERE guild_id = ? AND user_id = ? AND type = ? AND active = 1')
        .run(guildId, userId, 'ban');
      addPunishment(guildId, { userId, moderatorId: 'panel', type: 'unban', reason: 'Odbanowanie przez panel', active: false });
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', 'Błąd unban: ' + err.message, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  // Historia kar użytkownika
  app.get('/api/guilds/:guildId/punishments/:userId', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const punishments = db.prepare(
        'SELECT * FROM punishments WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'
      ).all(req.params.guildId, req.params.userId);
      res.json({ success: true, punishments });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Aktywne kary użytkownika
  app.get('/api/guilds/:guildId/punishments/:userId/active', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const mute = db.prepare(
        'SELECT * FROM punishments WHERE guild_id = ? AND user_id = ? AND type = ? AND active = 1 LIMIT 1'
      ).get(req.params.guildId, req.params.userId, 'mute');
      const ban = db.prepare(
        'SELECT * FROM punishments WHERE guild_id = ? AND user_id = ? AND type = ? AND active = 1 LIMIT 1'
      ).get(req.params.guildId, req.params.userId, 'ban');
      res.json({ success: true, mute: mute || null, ban: ban || null });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Usuwanie warna
  app.delete('/api/guilds/:guildId/punishments/warn/:warnId', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const result = db.prepare(
        'DELETE FROM punishments WHERE id = ? AND guild_id = ? AND type = ?'
      ).run(req.params.warnId, req.params.guildId, 'warn');
      if (result.changes === 0) return res.status(404).json({ error: 'Warn nie znaleziony' });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Ustawienia moderacji
  app.get('/api/guilds/:guildId/moderation/settings', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const settings = db.prepare('SELECT * FROM moderation_settings WHERE guild_id = ?').get(req.params.guildId);
      res.json(settings || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Kanały (potrzebne dla ustawień moderacji w panelu) ────────────────────
  app.get('/api/guilds/:guildId/channels', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Serwer nie znaleziony' });
      const channels = guild.channels.cache
        .filter(c => c.type === 0)
        .map(c => ({ id: c.id, name: c.name, type: c.type }));
      res.json(channels);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Członkowie ────────────────────────────────────────────────────────────
  const membersCache = new Map();
  const CACHE_TTL = 10 * 60 * 1000;

  app.get('/api/guilds/:guildId/members', async (req, res) => {
    try {
      const { guildId } = req.params;
      const cached = membersCache.get(guildId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return res.json(cached.data);

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });

      let members = guild.members.cache.filter(m => !m.user.bot);
      if (members.size < 10) {
        try { members = await guild.members.fetch({ limit: 1000 }); members = members.filter(m => !m.user.bot); }
        catch {}
      }

      const data = members.map(m => ({
        id: m.id, username: m.user.username, displayName: m.displayName,
        avatar: m.user.avatar, joinedAt: m.joinedAt,
        roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => r.id),
      }));

      membersCache.set(guildId, { data, timestamp: Date.now() });
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Role ──────────────────────────────────────────────────────────────────
  app.get('/api/guilds/:guildId/roles', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Serwer nie znaleziony' });
      const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }));
      res.json(roles);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  setInterval(() => {
    const now = Date.now();
    membersCache.forEach((v, k) => { if (now - v.timestamp > CACHE_TTL) membersCache.delete(k); });
  }, 15 * 60 * 1000);

  logger.system('info', 'Moduł moderation załadowany', 'moderation');
};
