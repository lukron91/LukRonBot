module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule('moderation', false, 'System moderacji, kar i zarządzania użytkownikami');

  // ===== CACHE CZŁONKÓW =====
  const membersCache = new Map();
  const MEMBERS_CACHE_TTL = 10 * 60 * 1000;

  // ===== POBIERANIE CZŁONKÓW (BEZ BOTÓW) =====
  app.get('/api/guilds/:guildId/members', async (req, res) => {
    const logger = app.locals.logger;
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
          logger.activity('warn', `[API] Rate limit - używam cache: ${fetchErr.message}`, 'moderation');
        }
      }

      membersCache.set(guildId, { data: members, timestamp: Date.now() });
      res.json(members);
    } catch (error) {
      logger.activity('error', `[API] Błąd pobierania członków: ${error.message}`, 'moderation');
      res.status(500).json({ error: error.message });
    }
  });

  // ===== POBIERANIE RÓL =====
  app.get('/api/guilds/:guildId/roles', async (req, res) => {
    const logger = app.locals.logger;
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
      logger.activity('error', `[API] Błąd pobierania ról: ${error.message}`, 'moderation');
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

  app.locals.logger.system('info', 'Moduł moderation załadowany, endpointy gotowe', 'moderation');
};