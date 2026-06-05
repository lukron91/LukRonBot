const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule('moderation', false, 'System moderacji, kar i zarządzania użytkownikami');

  // ===== MODELE MONGODB =====
  const WarnSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    moderatorId: String,
    reason: String,
    date: { type: Date, default: Date.now }
  });

  const MuteSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    moderatorId: String,
    reason: String,
    duration: Number,
    date: { type: Date, default: Date.now },
    expiresAt: Date
  });

  const BanSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    moderatorId: String,
    reason: String,
    type: { type: String, default: 'discord' },
    roleId: String,
    date: { type: Date, default: Date.now }
  });

  const Warn = mongoose.models.Warn || mongoose.model('Warn', WarnSchema);
  const Mute = mongoose.models.Mute || mongoose.model('Mute', MuteSchema);
  const Ban = mongoose.models.Ban || mongoose.model('Ban', BanSchema);

  // ===== CACHE CZŁONKÓW =====
  const membersCache = new Map();
  const MEMBERS_CACHE_TTL = 10 * 60 * 1000;

  // ===== POBIERANIE CZŁONKÓW (BEZ BOTÓW) =====
  app.get('/api/guilds/:guildId/members', async (req, res) => {
    try {
      const { guildId } = req.params;

      const cached = membersCache.get(guildId);
      if (cached && Date.now() - cached.timestamp < MEMBERS_CACHE_TTL) {
        return res.json(cached.data);
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
      }

      let members = guild.members.cache
        .filter(member => !member.user.bot)
        .map(member => ({
          id: member.id,
          username: member.user.username,
          displayName: member.displayName,
          avatar: member.user.avatar,
          joinedAt: member.joinedAt,
          roles: member.roles.cache
            .filter(r => r.id !== guild.id)
            .map(r => ({ id: r.id, name: r.name }))
        }));

      if (members.length < 10) {
        try {
          const fetched = await guild.members.fetch({ limit: 1000 });
          members = fetched
            .filter(member => !member.user.bot)
            .map(member => ({
              id: member.id,
              username: member.user.username,
              displayName: member.displayName,
              avatar: member.user.avatar,
              joinedAt: member.joinedAt,
              roles: member.roles.cache
                .filter(r => r.id !== guild.id)
                .map(r => ({ id: r.id, name: r.name }))
            }));
        } catch (fetchErr) {
          console.warn('[Members] Rate limit - używam cache:', fetchErr.message);
        }
      }

      membersCache.set(guildId, { data: members, timestamp: Date.now() });
      res.json(members);
    } catch (error) {
      console.error('[Members] Błąd:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== AKTYWNE KARY (MUSI BYĆ PRZED /:userId!) =====
  app.get('/api/guilds/:guildId/punishments/:userId/active', async (req, res) => {
    try {
      const { guildId, userId } = req.params;

      const activeMute = await Mute.findOne({
        guildId,
        userId,
        expiresAt: { $gt: new Date() }
      }).sort({ date: -1 });

      const activeBan = await Ban.findOne({
        guildId,
        userId
      }).sort({ date: -1 });

      res.json({
        mute: activeMute ? {
          id: activeMute._id.toString(),
          reason: activeMute.reason,
          duration: activeMute.duration,
          date: activeMute.date,
          expiresAt: activeMute.expiresAt
        } : null,
        ban: activeBan ? {
          id: activeBan._id.toString(),
          reason: activeBan.reason,
          type: activeBan.type || 'discord',
          roleId: activeBan.roleId,
          date: activeBan.date
        } : null
      });
    } catch (error) {
      console.error('[Active Punishments] Błąd:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== HISTORIA KAR DLA UŻYTKOWNIKA =====
  app.get('/api/guilds/:guildId/punishments/:userId', async (req, res) => {
    try {
      const { guildId, userId } = req.params;

      const warns = await Warn.find({ guildId, userId }).sort({ date: -1 });
      const mutes = await Mute.find({ guildId, userId }).sort({ date: -1 });
      const bans = await Ban.find({ guildId, userId }).sort({ date: -1 });

      res.json({
        warnings: warns.map(w => ({
          id: w._id.toString(),
          reason: w.reason,
          moderatorId: w.moderatorId,
          date: w.date,
          type: 'warn'
        })),
        mutes: mutes.map(m => ({
          id: m._id.toString(),
          reason: m.reason,
          moderatorId: m.moderatorId,
          duration: m.duration,
          date: m.date,
          expiresAt: m.expiresAt,
          type: 'mute'
        })),
        bans: bans.map(b => ({
          id: b._id.toString(),
          reason: b.reason,
          moderatorId: b.moderatorId,
          banType: b.type || 'discord',
          roleId: b.roleId,
          date: b.date,
          type: 'ban'
        }))
      });
    } catch (error) {
      console.error('[Punishments] Błąd:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== NADAWANIE WARNU =====
  app.post('/api/guilds/:guildId/moderation/warn', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, moderatorId, reason } = req.body;

      const warn = new Warn({ guildId, userId, moderatorId, reason });
      await warn.save();

      try {
        const user = await client.users.fetch(userId);
        await user.send(`⚠️ Otrzymałeś ostrzeżenie na serwerze. Powód: ${reason}`);
      } catch (e) {}

      res.json({ success: true, warn });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== WYCISZANIE =====
  app.post('/api/guilds/:guildId/moderation/mute', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, moderatorId, reason, duration } = req.body;

      const mute = new Mute({
        guildId,
        userId,
        moderatorId,
        reason,
        duration,
        expiresAt: duration > 0 ? new Date(Date.now() + duration * 60000) : null
      });
      await mute.save();

      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          try {
            await member.timeout(duration * 60 * 1000, reason);
          } catch (e) {
            console.warn('[Mute] Timeout error:', e.message);
          }
        }
      }

      res.json({ success: true, mute });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== BANOWANIE (systemowe lub przez rolę) =====
  app.post('/api/guilds/:guildId/moderation/ban', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, moderatorId, reason, banType, roleId } = req.body;

      const ban = new Ban({
        guildId,
        userId,
        moderatorId,
        reason,
        type: banType || 'discord',
        roleId: roleId || null
      });
      await ban.save();

      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        if (banType === 'role' && roleId) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            await member.roles.add(roleId, reason);
          }
        } else {
          await guild.members.ban(userId, { reason });
        }
      }

      res.json({ success: true, ban });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== ODCISZANIE (unmute) =====
  app.post('/api/guilds/:guildId/moderation/unmute', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId } = req.body;

      const mute = await Mute.findOneAndDelete({ guildId, userId });

      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          try {
            await member.timeout(null);
          } catch (e) {
            console.warn('[Unmute] Timeout error:', e.message);
          }
        }
      }

      res.json({ success: true, message: 'Użytkownik odciszony' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== ODBANOWYWANIE (unban) =====
  app.post('/api/guilds/:guildId/moderation/unban', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId } = req.body;

      const ban = await Ban.findOneAndDelete({ guildId, userId });

      const guild = client.guilds.cache.get(guildId);
      if (guild && ban) {
        if (ban.type === 'role' && ban.roleId) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            try {
              await member.roles.remove(ban.roleId);
            } catch (e) {
              console.warn('[Unban] Role remove error:', e.message);
            }
          }
        } else {
          try {
            await guild.members.unban(userId);
          } catch (e) {
            console.warn('[Unban] Discord unban error:', e.message);
          }
        }
      }

      res.json({ success: true, message: 'Użytkownik odbanowany' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== USUWANIE KARY =====
  app.delete('/api/guilds/:guildId/punishments/:type/:punishmentId', async (req, res) => {
    try {
      const { guildId, type, punishmentId } = req.params;

      let result;
      switch (type) {
        case 'warn':
          result = await Warn.findByIdAndDelete(punishmentId);
          break;
        case 'mute':
          result = await Mute.findByIdAndDelete(punishmentId);
          if (result) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              const member = await guild.members.fetch(result.userId).catch(() => null);
              if (member) {
                try { await member.timeout(null); } catch (e) {}
              }
            }
          }
          break;
        case 'ban':
          result = await Ban.findByIdAndDelete(punishmentId);
          if (result && result.type === 'role' && result.roleId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              const member = await guild.members.fetch(result.userId).catch(() => null);
              if (member) {
                try { await member.roles.remove(result.roleId); } catch (e) {}
              }
            }
          } else if (result && (!result.type || result.type === 'discord')) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              try { await guild.members.unban(result.userId); } catch (e) {}
            }
          }
          break;
        default:
          return res.status(400).json({ error: 'Nieprawidłowy typ kary' });
      }

      if (!result) {
        return res.status(404).json({ error: 'Kara nie znaleziona' });
      }

      res.json({ success: true, message: 'Kara usunięta' });
    } catch (error) {
      console.error('[Delete Punishment] Błąd:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== POBIERANIE RÓL =====
  app.get('/api/guilds/:guildId/roles', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Serwer nie znaleziony' });
      }

      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id && r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }));

      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== KONFIGURACJA SERWERA =====
  app.get('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const guildId = req.params.guildId;
      res.json({
        guildId,
        banMethod: 'discord',
        banRoleId: null
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/guilds/:guildId/config', async (req, res) => {
    try {
      const { banMethod, banRoleId } = req.body;
      res.json({ success: true, banMethod, banRoleId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CZYSZCZENIE CACHE =====
  setInterval(() => {
    const now = Date.now();
    membersCache.forEach((value, key) => {
      if (now - value.timestamp > MEMBERS_CACHE_TTL) {
        membersCache.delete(key);
      }
    });
  }, 15 * 60 * 1000);

  console.log('[Moderation] Moduł załadowany, endpointy gotowe');
};