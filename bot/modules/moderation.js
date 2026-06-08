const { makeModel, mongoose } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'System moderacji i kar');
  const logger = app.locals.logger;

  // Model kar — używa kolekcji 'punishments' zdefiniowanej w db.js
  // makeModel nie rejestruje duplikatu jeśli model już istnieje
  const Punishment = makeModel('punishments', new mongoose.Schema({
    guildId:     { type: String, required: true },
    userId:      { type: String, required: true },
    moderatorId: { type: String, required: true },
    type:        { type: String, required: true, enum: ['warn', 'mute', 'ban', 'kick', 'unmute', 'unban'] },
    banType:     { type: String, enum: ['discord', 'role'] },
    reason:      { type: String, default: 'Brak powodu' },
    duration:    Number,
    expiresAt:   Date,
    active:      { type: Boolean, default: true },
  }, { timestamps: true }));

  // Model ustawień moderacji per serwer
  const ModerationSettings = makeModel('moderation_settings', new mongoose.Schema({
    guildId:            { type: String, required: true, unique: true },
    banType:            { type: String, default: 'discord', enum: ['discord', 'role'] },
    banRoleId:          String,
    appealChannelId:    String,
    modLogChannel:      String,
    autoModEnabled:     { type: Boolean, default: false },
    blockLinks:         { type: Boolean, default: false },
    blockInvites:       { type: Boolean, default: false },
    warnThreshold:      { type: Number, default: 3 },
    muteRoleId:         String,
    commandPermissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    commandEnabled:     { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true }));

  // ── Endpointy kar ─────────────────────────────────────────────────────────

  app.post('/api/guilds/:guildId/moderation/:action', async (req, res) => {
    const { guildId, action } = req.params;
    if (!['warn', 'mute', 'ban', 'kick'].includes(action))
      return res.status(400).json({ error: 'Nieprawidłowa akcja' });

    const { userId, moderatorId, reason, duration, banType: banMethod, bannedRoleId } = req.body;

    try {
      const punishment = await Punishment.create({
        guildId, userId,
        moderatorId: moderatorId || 'panel',
        type: action,
        reason: reason || 'Brak powodu',
        duration: action === 'mute' ? duration : undefined,
        expiresAt: (action === 'mute' && duration) ? new Date(Date.now() + duration * 60000) : undefined,
        banType: action === 'ban' ? banMethod : undefined,
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

      res.json({ success: true, punishmentId: punishment._id });
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
      await Punishment.updateMany({ guildId, userId, type: 'mute', active: true }, { active: false });
      await Punishment.create({ guildId, userId, moderatorId: 'panel', type: 'unmute', reason: 'Odciszenie przez panel', active: false });
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
      await Punishment.updateMany({ guildId, userId, type: 'ban', active: true }, { active: false });
      await Punishment.create({ guildId, userId, moderatorId: 'panel', type: 'unban', reason: 'Odbanowanie przez panel', active: false });
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', 'Błąd unban: ' + err.message, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  // Historia kar użytkownika
  app.get('/api/guilds/:guildId/punishments/:userId', async (req, res) => {
    try {
      const punishments = await Punishment.find({
        guildId: req.params.guildId,
        userId: req.params.userId,
      }).sort({ createdAt: -1 });
      res.json({ success: true, punishments });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Aktywne kary użytkownika
  app.get('/api/guilds/:guildId/punishments/:userId/active', async (req, res) => {
    try {
      const mute = await Punishment.findOne({ guildId: req.params.guildId, userId: req.params.userId, type: 'mute', active: true });
      const ban  = await Punishment.findOne({ guildId: req.params.guildId, userId: req.params.userId, type: 'ban',  active: true });
      res.json({ success: true, mute: mute || null, ban: ban || null });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Usuwanie warna
  app.delete('/api/guilds/:guildId/punishments/warn/:warnId', async (req, res) => {
    try {
      const result = await Punishment.deleteOne({ _id: req.params.warnId, guildId: req.params.guildId, type: 'warn' });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Warn nie znaleziony' });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Ustawienia moderacji
  app.get('/api/guilds/:guildId/moderation/settings', async (req, res) => {
    try {
      const settings = await ModerationSettings.findOne({ guildId: req.params.guildId });
      res.json(settings || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Kanały (potrzebne dla ustawień moderacji w panelu) ────────────────────
  app.get('/api/guilds/:guildId/channels', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Serwer nie znaleziony' });
      const channels = guild.channels.cache
        .filter(c => c.type === 0) // tylko tekstowe
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
