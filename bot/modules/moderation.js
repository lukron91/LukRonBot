const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'System moderacji i kar');

  const logger = app.locals.logger;
  const col = app.locals.dbCollection;

  const ModerationSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    type: { type: String, required: true, enum: ['warn', 'mute', 'ban', 'kick'] },
    reason: { type: String, default: 'Brak powodu' },
    duration: { type: Number, default: null },
    expiresAt: { type: Date, default: null }
  }, { timestamps: true, collection: col('moderations') });

  ModerationSchema.index({ guildId: 1, userId: 1 });

  const Moderation = mongoose.models[col('moderations')]
    || mongoose.model(col('moderations'), ModerationSchema);

  app.post('/api/guilds/:guildId/punishments', async (req, res) => {
    const { guildId } = req.params;
    const { userId, moderatorId, type, reason, duration, banMethod, bannedRoleId } = req.body;

    if (!['warn', 'mute', 'ban', 'kick'].includes(type)) {
      return res.status(400).json({ error: 'Nieprawidłowy typ kary' });
    }

    try {
      const punishment = await Moderation.create({
        guildId,
        userId,
        moderatorId,
        type,
        reason: reason || 'Brak powodu',
        duration: type === 'mute' ? duration : null,
        expiresAt: (type === 'mute' && duration) ? new Date(Date.now() + duration * 60000) : null
      });

      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        try {
          if (type === 'ban') {
            if (banMethod === 'role' && bannedRoleId) {
              const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
              if (member) {
                await member.roles.add(bannedRoleId, `Ban przez panel: ${reason}`);
                logger.activity('info', `[API] Nadano rolę bana ${bannedRoleId} dla user=${userId} w ${guildId}`, 'moderation');
              }
            } else {
              await guild.members.ban(userId, { reason: `Ban przez panel: ${reason}` });
              logger.activity('info', `[API] Zbanowano user=${userId} na Discordzie w ${guildId}`, 'moderation');
            }
          } else if (type === 'kick') {
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
            if (member) {
              await member.kick(`Kick przez panel: ${reason}`);
              logger.activity('info', `[API] Wyrzucono user=${userId} z ${guildId}`, 'moderation');
            }
          } else if (type === 'mute') {
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
            if (member && duration) {
              await member.timeout(duration * 60 * 1000, `Mute przez panel: ${reason}`);
              logger.activity('info', `[API] Wyciszono user=${userId} w ${guildId} na ${duration} minut`, 'moderation');
            }
          }
        } catch (discordErr) {
          logger.activity('warn', `[API] Nie udało się wykonać kary ${type} na Discordzie: ${discordErr.message}`, 'moderation');
        }
      }

      logger.activity('info', `[API] Kara ${type} zapisana w bazie: user=${userId} moderator=${moderatorId} (id=${punishment._id})`, 'moderation');
      res.json({ success: true, punishmentId: punishment._id });
    } catch (err) {
      logger.activity('error', `[API] Błąd przy karze ${type} dla user=${userId} w ${guildId}: ${err.message}`, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/punishments/:userId', async (req, res) => {
    try {
      const punishments = await Moderation.find({ guildId: req.params.guildId, userId: req.params.userId }).sort({ createdAt: -1 });
      res.json({ success: true, punishments });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu kar dla user=${req.params.userId}: ${err.message}`, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/guilds/:guildId/punishments/:punishmentId', async (req, res) => {
    try {
      const result = await Moderation.deleteOne({ guildId: req.params.guildId, _id: req.params.punishmentId });
      if (result.deletedCount === 0) {
        logger.activity('warn', `[API] Próba usunięcia nieistniejącej kary ${req.params.punishmentId}`, 'moderation');
        return res.status(404).json({ error: 'Kara nie znaleziona' });
      }
      logger.activity('info', `[API] Usunięto karę ${req.params.punishmentId} w ${req.params.guildId}`, 'moderation');
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', `[API] Błąd usuwania kary: ${err.message}`, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  const membersCache = new Map();
  const MEMBERS_CACHE_TTL = 10 * 60 * 1000;

  app.get('/api/guilds/:guildId/members', async (req, res) => {
    try {
      const { guildId } = req.params;
      const cached = membersCache.get(guildId);
      if (cached && Date.now() - cached.timestamp < MEMBERS_CACHE_TTL) return res.json(cached.data);

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });

      let members = guild.members.cache
        .filter(m => !m.user.bot)
        .map(m => ({
          id: m.id, username: m.user.username, displayName: m.displayName,
          avatar: m.user.avatar, joinedAt: m.joinedAt,
          roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name }))
        }));

      if (members.length < 10) {
        try {
          const fetched = await guild.members.fetch({ limit: 1000 });
          members = fetched.filter(m => !m.user.bot).map(m => ({
            id: m.id, username: m.user.username, displayName: m.displayName,
            avatar: m.user.avatar, joinedAt: m.joinedAt,
            roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name }))
          }));
        } catch (fetchErr) {
          logger.activity('warn', `[API] Rate limit przy pobieraniu członków: ${fetchErr.message}`, 'moderation');
        }
      }

      membersCache.set(guildId, { data: members, timestamp: Date.now() });
      res.json(members);
    } catch (err) {
      logger.activity('error', `[API] Błąd pobierania członków: ${err.message}`, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/roles', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Serwer nie znaleziony' });
      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id && r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }));
      res.json(roles);
    } catch (err) {
      logger.activity('error', `[API] Błąd pobierania ról: ${err.message}`, 'moderation');
      res.status(500).json({ error: err.message });
    }
  });

  setInterval(() => {
    const now = Date.now();
    membersCache.forEach((value, key) => {
      if (now - value.timestamp > MEMBERS_CACHE_TTL) membersCache.delete(key);
    });
  }, 15 * 60 * 1000);

  logger.system('info', 'Moduł moderation załadowany', 'moderation');
};