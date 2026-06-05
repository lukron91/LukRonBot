// modules/moderation.js
module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  // Rejestracja modułu
  registerModule(moduleName);

  // Pamięć tymczasowa (fallback)
  const memoryConfigs = new Map();
  const memoryWarns = new Map();
  const memoryMutes = new Map();
  const memoryBans = new Map();

  let Guild = null;
  let Warn = null;
  let Mute = null;
  let Ban = null;
  let dbConnected = false;

  // Inicjalizacja modeli z mongoose (jeśli istnieją)
  const initModels = () => {
    const mongoose = require('mongoose');
    if (mongoose.models.Guild) {
      Guild = mongoose.models.Guild;
      Warn = mongoose.models.Warn;
      Mute = mongoose.models.Mute;
      Ban = mongoose.models.Ban;
      dbConnected = true;
      console.log('[moderation] Modele zaimportowane z głównego pliku');
    } else {
      console.log('[moderation] Brak modeli – używam pamięci tymczasowej');
    }
  };
  initModels();

  // Funkcje pomocnicze (kopiuj z poprzedniego moderation.js, ale bez definiowania schematów)
  async function getConfig(guildId) {
    if (dbConnected && Guild) {
      try {
        let config = await Guild.findOne({ guildId });
        if (!config) {
          config = new Guild({ guildId });
          await config.save();
        }
        return config.toObject();
      } catch (err) {
        console.error('Błąd odczytu z bazy:', err);
      }
    }
    if (!memoryConfigs.has(guildId)) {
      memoryConfigs.set(guildId, {
        guildId,
        prefix: '!',
        language: 'pl',
        timezone: 'Europe/Warsaw',
        autoModEnabled: false,
        blockLinks: false,
        blockInvites: false,
        welcomeEnabled: false,
        logEnabled: false,
        warnThreshold: 3,
        banMethod: 'discord',
        banRoleId: null,
        modLogChannel: null,
      });
    }
    return memoryConfigs.get(guildId);
  }

  async function setConfig(guildId, update) {
    if (dbConnected && Guild) {
      try {
        const config = await Guild.findOneAndUpdate(
          { guildId },
          { ...update, guildId },
          { upsert: true, new: true }
        );
        return config.toObject();
      } catch (err) {
        console.error('Błąd zapisu do bazy:', err);
        throw err;
      }
    }
    const current = memoryConfigs.get(guildId) || { guildId };
    const updated = { ...current, ...update };
    memoryConfigs.set(guildId, updated);
    return updated;
  }

  async function getPunishments(guildId, userId) {
    if (dbConnected) {
      try {
        const [warns, mutes, bans] = await Promise.all([
          Warn.findOne({ guildId, userId }),
          Mute.findOne({ guildId, userId }),
          Ban.findOne({ guildId, userId })
        ]);
        return {
          warnings: warns?.warnings || [],
          mutes: mutes ? [mutes] : [],
          bans: bans ? [bans] : []
        };
      } catch (err) { console.error(err); }
    }
    return {
      warnings: memoryWarns.get(`${guildId}_${userId}`) || [],
      mutes: memoryMutes.get(`${guildId}_${userId}`) ? [memoryMutes.get(`${guildId}_${userId}`)] : [],
      bans: memoryBans.get(`${guildId}_${userId}`) ? [memoryBans.get(`${guildId}_${userId}`)] : []
    };
  }

  async function addWarn(guildId, userId, reason, moderatorId) {
    if (dbConnected && Warn) {
      const warnDoc = await Warn.findOneAndUpdate(
        { guildId, userId },
        { $push: { warnings: { reason, moderatorId, date: new Date() } } },
        { upsert: true, new: true }
      );
      return warnDoc.warnings;
    } else {
      const key = `${guildId}_${userId}`;
      const warns = memoryWarns.get(key) || [];
      warns.push({ reason, moderatorId, date: new Date() });
      memoryWarns.set(key, warns);
      return warns;
    }
  }

  async function addMute(guildId, userId, reason, moderatorId, duration) {
    const mute = { guildId, userId, reason, moderatorId, duration, endTime: new Date(Date.now() + duration * 1000), date: new Date() };
    if (dbConnected && Mute) {
      await Mute.findOneAndUpdate({ guildId, userId }, mute, { upsert: true });
    } else {
      memoryMutes.set(`${guildId}_${userId}`, mute);
    }
    return mute;
  }

  async function addBan(guildId, userId, reason, moderatorId, type, roleId = null) {
    const ban = { guildId, userId, reason, moderatorId, type, roleId, date: new Date() };
    if (dbConnected && Ban) {
      await Ban.findOneAndUpdate({ guildId, userId }, ban, { upsert: true });
    } else {
      memoryBans.set(`${guildId}_${userId}`, ban);
    }
    return ban;
  }

  async function sendLog(guildId, embedData) {
    try {
      const config = await getConfig(guildId);
      const logChannelId = config.modLogChannel;
      if (!logChannelId) return;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;
      const channel = guild.channels.cache.get(logChannelId);
      if (!channel || !channel.isTextBased()) return;
      await channel.send({ embeds: [embedData] });
    } catch (err) { console.error('Błąd logowania:', err); }
  }

  function createLogEmbed(title, description, color, fields = []) {
    return {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      fields,
      footer: { text: 'LukRon Bot - System kar' }
    };
  }

  // ---------- ENDPOINTY ----------
  app.get('/api/guilds/:guildId/roles', async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id && r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }));
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/channels', async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
      const channels = guild.channels.cache
        .filter(c => c.isTextBased())
        .map(c => ({ id: c.id, name: c.name, type: c.type }));
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/members', async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
      await guild.members.fetch();
      const members = guild.members.cache.filter(m => !m.user.bot);
      const users = members.map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        avatar: member.user.avatar,
        joinedAt: member.joinedAt
      }));
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Nie udało się pobrać listy użytkowników' });
    }
  });

  app.get('/api/guilds/:guildId/punishments/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    try {
      const punishments = await getPunishments(guildId, userId);
      res.json(punishments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/guilds/:guildId/config/moderation', async (req, res) => {
    const { guildId } = req.params;
    const updates = req.body;
    try {
      const config = await setConfig(guildId, updates);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/guilds/:guildId/warn', async (req, res) => {
    const { guildId } = req.params;
    const { userId, reason, moderatorId } = req.body;
    if (!reason) return res.status(400).json({ error: 'Powód jest wymagany' });
    try {
      await addWarn(guildId, userId, reason, moderatorId || 'panel');
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          const embed = createLogEmbed('⚠️ Ostrzeżenie', `Użytkownik **${member.user.tag}** otrzymał ostrzeżenie.`, 0xF0B232, [
            { name: 'Powód', value: reason, inline: true },
            { name: 'Moderator', value: moderatorId ? `<@${moderatorId}>` : 'Panel', inline: true }
          ]);
          await sendLog(guildId, embed);
        }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/guilds/:guildId/mute', async (req, res) => {
    const { guildId } = req.params;
    const { userId, duration, reason, moderatorId } = req.body;
    if (!reason) return res.status(400).json({ error: 'Powód jest wymagany' });
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
      const member = await guild.members.fetch(userId);
      await member.timeout(duration * 1000, reason);
      await addMute(guildId, userId, reason, moderatorId || 'panel', duration);
      const embed = createLogEmbed('🔇 Wyciszenie', `Użytkownik **${member.user.tag}** został wyciszony.`, 0xF0B232, [
        { name: 'Powód', value: reason, inline: true },
        { name: 'Czas', value: `${Math.floor(duration / 60)} minut`, inline: true },
        { name: 'Moderator', value: moderatorId ? `<@${moderatorId}>` : 'Panel', inline: true }
      ]);
      await sendLog(guildId, embed);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/guilds/:guildId/ban', async (req, res) => {
    const { guildId } = req.params;
    const { userId, reason, moderatorId, banType, roleId } = req.body;
    if (!reason) return res.status(400).json({ error: 'Powód jest wymagany' });
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Bot nie jest na tym serwerze' });
      const member = await guild.members.fetch(userId);
      const config = await getConfig(guildId);
      const effectiveType = banType || config.banMethod || 'discord';
      if (effectiveType === 'discord') {
        await member.ban({ reason });
      } else {
        const roleIdToUse = roleId || config.banRoleId;
        if (!roleIdToUse) return res.status(400).json({ error: 'Nie wybrano roli do custom bana' });
        const role = guild.roles.cache.get(roleIdToUse);
        if (!role) return res.status(404).json({ error: 'Rola nie istnieje' });
        await member.roles.add(role, reason);
      }
      await addBan(guildId, userId, reason, moderatorId || 'panel', effectiveType, effectiveType === 'role' ? (roleId || config.banRoleId) : null);
      const embed = createLogEmbed('🔨 Ban', `Użytkownik **${member.user.tag}** został zbanowany.`, 0xED4245, [
        { name: 'Powód', value: reason, inline: true },
        { name: 'Typ bana', value: effectiveType === 'discord' ? 'Discord Ban' : 'Custom ban (rola)', inline: true },
        { name: 'Moderator', value: moderatorId ? `<@${moderatorId}>` : 'Panel', inline: true }
      ]);
      await sendLog(guildId, embed);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log('[moderation] Moduł moderacji załadowany (endpointy gotowe)');
module.exports.description = `Moduł moderacji – zawiera endpointy do zarządzania karami: ostrzeżenia (warn), wyciszenia (mute), bany (ban), lista użytkowników, role, kanały, konfiguracja moderacji.`;
};
