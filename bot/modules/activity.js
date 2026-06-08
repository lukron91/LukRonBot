const { makeModel, mongoose } = require('../db');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Statystyki aktywności serwerów');
  const logger = app.locals.logger;

  const Activity = makeModel('activities', new mongoose.Schema({
    guildId:       { type: String, required: true },
    date:          { type: Date,   required: true },
    messages:      { type: Number, default: 0 },
    membersJoined: { type: Number, default: 0 },
    membersLeft:   { type: Number, default: 0 },
    topChannels:   [{ channelId: String, channelName: String, count: Number }],
    topUsers:      [{ userId: String, username: String, avatar: String, count: Number }],
  }, { timestamps: true }));

  function getToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    try {
      const today = getToday();
      let act = await Activity.findOne({ guildId: message.guild.id, date: today });
      if (!act) act = new Activity({ guildId: message.guild.id, date: today });

      act.messages += 1;

      const chIdx = act.topChannels.findIndex(c => c.channelId === message.channel.id);
      if (chIdx >= 0) { act.topChannels[chIdx].count += 1; act.topChannels[chIdx].channelName = message.channel.name; }
      else act.topChannels.push({ channelId: message.channel.id, channelName: message.channel.name, count: 1 });

      const uIdx = act.topUsers.findIndex(u => u.userId === message.author.id);
      if (uIdx >= 0) act.topUsers[uIdx].count += 1;
      else act.topUsers.push({ userId: message.author.id, username: message.author.username, avatar: message.author.avatar, count: 1 });

      await act.save();
    } catch (err) {
      logger.activity('error', 'Błąd zapisu aktywności: ' + err.message, 'activity');
    }
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      const today = getToday();
      let act = await Activity.findOne({ guildId: member.guild.id, date: today });
      if (!act) act = new Activity({ guildId: member.guild.id, date: today });
      act.membersJoined += 1;
      await act.save();
      logger.activity('info', 'Dołączył: ' + member.user.tag, 'activity');
    } catch (err) { logger.activity('error', 'Błąd guildMemberAdd: ' + err.message, 'activity'); }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      const today = getToday();
      let act = await Activity.findOne({ guildId: member.guild.id, date: today });
      if (!act) act = new Activity({ guildId: member.guild.id, date: today });
      act.membersLeft += 1;
      await act.save();
      logger.activity('info', 'Opuścił: ' + member.user.tag, 'activity');
    } catch (err) { logger.activity('error', 'Błąd guildMemberRemove: ' + err.message, 'activity'); }
  });

  app.get('/api/guilds/:guildId/activity/joined-today', async (req, res) => {
    try {
      const act = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      res.json({ success: true, count: act?.membersJoined || 0 });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/left-today', async (req, res) => {
    try {
      const act = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      res.json({ success: true, count: act?.membersLeft || 0 });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/active-7days', async (req, res) => {
    try {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const acts = await Activity.find({ guildId: req.params.guildId, date: { $gte: since } });
      const unique = new Set();
      acts.forEach(a => a.topUsers.forEach(u => unique.add(u.userId)));
      res.json({ success: true, count: unique.size });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/trend', async (req, res) => {
    try {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const acts = await Activity.find({ guildId: req.params.guildId, date: { $gte: since } }).sort({ date: 1 });
      const trend = acts.map(a => ({
        label: new Date(a.date).toLocaleDateString('pl-PL', { weekday: 'short' }).slice(0, 3),
        count: a.messages,
      }));
      res.json({ success: true, trend });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/top-channels', async (req, res) => {
    try {
      const act = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      const channels = (act?.topChannels || []).sort((a, b) => b.count - a.count).slice(0, 5)
        .map(c => ({ channelId: c.channelId, name: c.channelName || 'Nieznany', count: c.count }));
      res.json({ success: true, channels });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/guilds/:guildId/activity/top-users', async (req, res) => {
    try {
      const act = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      const users = (act?.topUsers || []).sort((a, b) => b.count - a.count).slice(0, 5)
        .map(u => ({ id: u.userId, username: u.username, avatar: u.avatar, count: u.count }));
      res.json({ success: true, users });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  logger.system('info', 'Moduł activity załadowany', 'activity');
};
