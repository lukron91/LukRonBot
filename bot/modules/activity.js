const { getDb } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Statystyki aktywności serwerów');
  const logger = app.locals.logger;

  function getTodayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function getOrCreateActivity(guildId) {
    const db = getDb(guildId);
    const today = getTodayStr();
    let act = db.prepare('SELECT * FROM activities WHERE guild_id = ? AND date = ?').get(guildId, today);
    if (!act) {
      db.prepare('INSERT INTO activities (guild_id, date) VALUES (?, ?)').run(guildId, today);
      act = db.prepare('SELECT * FROM activities WHERE guild_id = ? AND date = ?').get(guildId, today);
    }
    return { db, act };
  }

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    try {
      const { db, act } = getOrCreateActivity(message.guild.id);
      const topChannels = JSON.parse(act.top_channels || '[]');
      const topUsers = JSON.parse(act.top_users || '[]');

      const chIdx = topChannels.findIndex(c => c.channelId === message.channel.id);
      if (chIdx >= 0) { topChannels[chIdx].count += 1; topChannels[chIdx].channelName = message.channel.name; }
      else topChannels.push({ channelId: message.channel.id, channelName: message.channel.name, count: 1 });

      const uIdx = topUsers.findIndex(u => u.userId === message.author.id);
      if (uIdx >= 0) topUsers[uIdx].count += 1;
      else topUsers.push({ userId: message.author.id, username: message.author.username, avatar: message.author.avatar, count: 1 });

      db.prepare('UPDATE activities SET messages = messages + 1, top_channels = ?, top_users = ? WHERE id = ?')
        .run(JSON.stringify(topChannels), JSON.stringify(topUsers), act.id);
    } catch (err) {
      logger.activity('error', 'Błąd zapisu aktywności: ' + err.message, 'activity');
    }
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      const { db, act } = getOrCreateActivity(member.guild.id);
      db.prepare('UPDATE activities SET members_joined = members_joined + 1 WHERE id = ?').run(act.id);
      logger.activity('info', 'Dołączył: ' + member.user.tag, 'activity');
    } catch (err) { logger.activity('error', 'Błąd guildMemberAdd: ' + err.message, 'activity'); }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      const { db, act } = getOrCreateActivity(member.guild.id);
      db.prepare('UPDATE activities SET members_left = members_left + 1 WHERE id = ?').run(act.id);
      logger.activity('info', 'Opuścił: ' + member.user.tag, 'activity');
    } catch (err) { logger.activity('error', 'Błąd guildMemberRemove: ' + err.message, 'activity'); }
  });

  app.get('/api/guilds/:guildId/activity/joined-today', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const act = db.prepare('SELECT members_joined FROM activities WHERE guild_id = ? AND date = ?')
        .get(req.params.guildId, getTodayStr());
      res.json({ success: true, count: act?.members_joined || 0 });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/left-today', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const act = db.prepare('SELECT members_left FROM activities WHERE guild_id = ? AND date = ?')
        .get(req.params.guildId, getTodayStr());
      res.json({ success: true, count: act?.members_left || 0 });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/active-7days', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const since = new Date(); since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().split('T')[0];
      const acts = db.prepare('SELECT top_users FROM activities WHERE guild_id = ? AND date >= ?')
        .all(req.params.guildId, sinceStr);
      const unique = new Set();
      acts.forEach(a => JSON.parse(a.top_users || '[]').forEach(u => unique.add(u.userId)));
      res.json({ success: true, count: unique.size });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/trend', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const since = new Date(); since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().split('T')[0];
      const acts = db.prepare('SELECT date, messages FROM activities WHERE guild_id = ? AND date >= ? ORDER BY date ASC')
        .all(req.params.guildId, sinceStr);
      const trend = acts.map(a => ({
        label: new Date(a.date + 'T00:00:00').toLocaleDateString('pl-PL', { weekday: 'short' }).slice(0, 3),
        count: a.messages,
      }));
      res.json({ success: true, trend });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/top-channels', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const act = db.prepare('SELECT top_channels FROM activities WHERE guild_id = ? AND date = ?')
        .get(req.params.guildId, getTodayStr());
      const channels = (JSON.parse(act?.top_channels || '[]'))
        .sort((a, b) => b.count - a.count).slice(0, 5)
        .map(c => ({ channelId: c.channelId, name: c.channelName || 'Nieznany', count: c.count }));
      res.json({ success: true, channels });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/top-users', async (req, res) => {
    try {
      const db = getDb(req.params.guildId);
      const act = db.prepare('SELECT top_users FROM activities WHERE guild_id = ? AND date = ?')
        .get(req.params.guildId, getTodayStr());
      const users = (JSON.parse(act?.top_users || '[]'))
        .sort((a, b) => b.count - a.count).slice(0, 5)
        .map(u => ({ id: u.userId, username: u.username, avatar: u.avatar, count: u.count }));
      res.json({ success: true, users });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  logger.system('info', 'Moduł activity załadowany', 'activity');
};
