/**
 * roles.js — Moduł zarządzania rolami
 *
 * Endpointy REST dla panelu zarządzania rolami.
 * Wszystko idzie przez Discord API — baza NIE jest potrzebna.
 *
 * Endpointy:
 *   GET    /api/guilds/:guildId/roles/detailed          — lista ról z detalami (kolor, perms, hoist itd.)
 *   POST   /api/guilds/:guildId/roles                   — utwórz rolę
 *   PATCH  /api/guilds/:guildId/roles/:roleId           — edytuj rolę
 *   DELETE /api/guilds/:guildId/roles/:roleId           — usuń rolę
 *   POST   /api/guilds/:guildId/roles/:roleId/copy      — kopiuj rolę (tworzy nową z dopiskiem "kopia N")
 *   POST   /api/guilds/:guildId/roles/:roleId/move      — przesuń rolę (direction: 'up' | 'down')
 *   GET    /api/guilds/:guildId/roles/:roleId/members   — członkowie mający tę rolę
 *   POST   /api/guilds/:guildId/roles/:roleId/members/:userId — nadaj/odbierz rolę (action: 'add' | 'remove')
 */

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Zarządzanie rolami przez panel');
  const logger = app.locals.logger;

  // ─── Helper ────────────────────────────────────────────────────────────────

  const getGuild = (guildId, res) => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) { res.status(404).json({ error: 'Bot nie jest na tym serwerze' }); return null; }
    return guild;
  };

  // Mapuje obiekt Role discord.js na plain object dla panelu
  const mapRole = (role) => ({
    id: role.id,
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    position: role.position,
    managed: role.managed,       // rola zarządzana (bot, integrace) — panel może ją pokazać ale nie edytować
    permissions: role.permissions.toArray(), // ['Administrator', 'ManageRoles', ...]
    memberCount: role.members?.size ?? 0,
  });

  // Zwraca kolejny wolny numer kopii: "nazwa kopia N"
  const getCopyName = (guild, originalName) => {
    const existing = guild.roles.cache.map(r => r.name);
    let n = 1;
    while (existing.includes(originalName + ' kopia ' + n)) n++;
    return originalName + ' kopia ' + n;
  };

  // ─── GET /roles/detailed ───────────────────────────────────────────────────

  app.get('/api/guilds/:guildId/roles/detailed', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    try {
      // Upewnij się że cache jest świeży
      await guild.roles.fetch();
      const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position) // od najwyższej pozycji
        .map(mapRole);
      res.json(roles);
    } catch (err) {
      logger.activity('error', '[roles] Błąd pobierania ról: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /roles — utwórz ─────────────────────────────────────────────────

  app.post('/api/guilds/:guildId/roles', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const { name, color, hoist, mentionable, permissions } = req.body;
    try {
      const role = await guild.roles.create({
        name: name || 'Nowa rola',
        color: color || 0,
        hoist: !!hoist,
        mentionable: !!mentionable,
        permissions: permissions || [],
        reason: 'Utworzono przez panel zarządzania',
      });
      logger.activity('info', '[roles] Utworzono rolę: ' + role.name + ' (' + role.id + ')', 'roles');
      res.json({ success: true, role: mapRole(role) });
    } catch (err) {
      logger.activity('error', '[roles] Błąd tworzenia roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── PATCH /roles/:roleId — edytuj ────────────────────────────────────────

  app.patch('/api/guilds/:guildId/roles/:roleId', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });
    if (role.managed) return res.status(403).json({ error: 'Nie można edytować roli zarządzanej przez bota/integrację' });

    const { name, color, hoist, mentionable, permissions } = req.body;
    try {
      const updated = await role.edit({
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(hoist !== undefined && { hoist }),
        ...(mentionable !== undefined && { mentionable }),
        ...(permissions !== undefined && { permissions }),
        reason: 'Edytowano przez panel zarządzania',
      });
      logger.activity('info', '[roles] Edytowano rolę: ' + updated.name + ' (' + updated.id + ')', 'roles');
      res.json({ success: true, role: mapRole(updated) });
    } catch (err) {
      logger.activity('error', '[roles] Błąd edycji roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── DELETE /roles/:roleId — usuń ─────────────────────────────────────────

  app.delete('/api/guilds/:guildId/roles/:roleId', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });
    if (role.managed) return res.status(403).json({ error: 'Nie można usunąć roli zarządzanej' });
    try {
      await role.delete('Usunięto przez panel zarządzania');
      logger.activity('info', '[roles] Usunięto rolę: ' + role.name + ' (' + role.id + ')', 'roles');
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', '[roles] Błąd usuwania roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /roles/:roleId/copy — kopiuj ────────────────────────────────────

  app.post('/api/guilds/:guildId/roles/:roleId/copy', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });
    try {
      const newName = getCopyName(guild, role.name);
      const copy = await guild.roles.create({
        name: newName,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions,
        reason: 'Kopia roli ' + role.name + ' przez panel',
      });
      logger.activity('info', '[roles] Skopiowano rolę: ' + role.name + ' → ' + copy.name, 'roles');
      res.json({ success: true, role: mapRole(copy) });
    } catch (err) {
      logger.activity('error', '[roles] Błąd kopiowania roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /roles/:roleId/move — przesuń pozycję ───────────────────────────

  app.post('/api/guilds/:guildId/roles/:roleId/move', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });
    const { direction } = req.body; // 'up' | 'down'
    const newPosition = direction === 'up' ? role.position + 1 : role.position - 1;
    if (newPosition < 1) return res.status(400).json({ error: 'Rola jest już na najniższej pozycji' });
    try {
      await role.setPosition(newPosition, { reason: 'Przesunięto przez panel' });
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', '[roles] Błąd przesuwania roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── GET /roles/:roleId/members — członkowie ──────────────────────────────

  app.get('/api/guilds/:guildId/roles/:roleId/members', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });
    try {
      await guild.members.fetch(); // odśwież cache
      const members = role.members.map(m => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.avatar,
      }));
      res.json({ success: true, members });
    } catch (err) {
      logger.activity('error', '[roles] Błąd pobierania członków roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /roles/:roleId/members/:userId — nadaj/odbierz ──────────────────

  app.post('/api/guilds/:guildId/roles/:roleId/members/:userId', async (req, res) => {
    const guild = getGuild(req.params.guildId, res);
    if (!guild) return;
    const { action } = req.body; // 'add' | 'remove'
    if (!['add', 'remove'].includes(action)) return res.status(400).json({ error: 'action musi być "add" lub "remove"' });
    try {
      const member = guild.members.cache.get(req.params.userId) || await guild.members.fetch(req.params.userId);
      if (!member) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      if (action === 'add') {
        await member.roles.add(req.params.roleId, 'Nadano przez panel');
        logger.activity('info', '[roles] Nadano rolę ' + req.params.roleId + ' dla ' + member.user.username, 'roles');
      } else {
        await member.roles.remove(req.params.roleId, 'Odebrano przez panel');
        logger.activity('info', '[roles] Odebrano rolę ' + req.params.roleId + ' od ' + member.user.username, 'roles');
      }
      res.json({ success: true });
    } catch (err) {
      logger.activity('error', '[roles] Błąd nadawania/odbierania roli: ' + err.message, 'roles');
      res.status(500).json({ error: err.message });
    }
  });

  logger.system('info', 'Moduł roles załadowany', 'roles');
};
