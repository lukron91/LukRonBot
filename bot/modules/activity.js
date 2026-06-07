const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Statystyki aktywności serwerów');

  const logger = app.locals.logger;
  const col = app.locals.dbCollection;

  const ActivitySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    date: { type: Date, required: true },
    messages: { type: Number, default: 0 },
    membersJoined: { type: Number, default: 0 },
    membersLeft: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    topChannels: [{
      channelId: String,
      channelName: String,
      count: Number
    }],
    topUsers: [{
      userId: String,
      username: String,
      avatar: String,
      count: Number
    }]
  }, { timestamps: true, collection: col('activities') });

  ActivitySchema.index({ guildId: 1, date: 1 }, { unique: true });

  const Activity = mongoose.models[col('activities')]
    || mongoose.model(col('activities'), ActivitySchema);

  function getToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    try {
      const today = getToday();
      let activity = await Activity.findOne({ guildId: message.guild.id, date: today });

      if (!activity) {
        activity = new Activity({
          guildId: message.guild.id,
          date: today,
          messages: 0,
          topChannels: [],
          topUsers: []
        });
      }

      activity.messages += 1;

      const chIdx = activity.topChannels.findIndex(c => c.channelId === message.channel.id);
      if (chIdx >= 0) {
        activity.topChannels[chIdx].count += 1;
        activity.topChannels[chIdx].channelName = message.channel.name;
      } else {
        activity.topChannels.push({ channelId: message.channel.id, channelName: message.channel.name, count: 1 });
      }

      const uIdx = activity.topUsers.findIndex(u => u.userId === message.author.id);
      if (uIdx >= 0) {
        activity.topUsers[uIdx].count += 1;
      } else {
        activity.topUsers.push({
          userId: message.author.id,
          username: message.author.username,
          avatar: message.author.avatar,
          count: 1
        });
      }

      await activity.save();
    } catch (err) {
      logger.activity('error', `Błąd zapisu wiadomości w kanale ${message.channel.id}: ${err.message}`, 'activity');
    }
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      const today = getToday();
      let activity = await Activity.findOne({ guildId: member.guild.id, date: today });
      if (!activity) activity = new Activity({ guildId: member.guild.id, date: today });
      activity.membersJoined += 1;
      await activity.save();
      logger.activity('info', `Użytkownik ${member.user.tag} dołączył do serwera`, 'activity');
    } catch (err) {
      logger.activity('error', `Błąd zapisu nowego członka: ${err.message}`, 'activity');
    }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      const today = getToday();
      let activity = await Activity.findOne({ guildId: member.guild.id, date: today });
      if (!activity) activity = new Activity({ guildId: member.guild.id, date: today });
      activity.membersLeft += 1;
      await activity.save();
      logger.activity('info', `Użytkownik ${member.user.tag} opuścił serwer`, 'activity');
    } catch (err) {
      logger.activity('error', `Błąd zapisu opuszczenia członka: ${err.message}`, 'activity');
    }
  });

  app.get('/api/guilds/:guildId/activity/joined-today', async (req, res) => {
    try {
      const activity = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      res.json({ success: true, count: activity?.membersJoined || 0 });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu joined-today: ${err.message}`, 'activity');
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/left-today', async (req, res) => {
    try {
      const activity = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      res.json({ success: true, count: activity?.membersLeft || 0 });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu left-today: ${err.message}`, 'activity');
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/active-7days', async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activities = await Activity.find({
        guildId: req.params.guildId,
        date: { $gte: sevenDaysAgo }
      });
      const uniqueUsers = new Set();
      activities.forEach(act => act.topUsers.forEach(u => uniqueUsers.add(u.userId)));
      res.json({ success: true, count: uniqueUsers.size });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu active-7days: ${err.message}`, 'activity');
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/trend', async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activities = await Activity.find({
        guildId: req.params.guildId,
        date: { $gte: sevenDaysAgo }
      }).sort({ date: 1 });
      const trend = activities.map(act => ({
        label: new Date(act.date).toLocaleDateString('pl-PL', { weekday: 'short' }).slice(0, 3),
        count: act.messages
      }));
      res.json({ success: true, trend });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu trend: ${err.message}`, 'activity');
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/top-channels', async (req, res) => {
    try {
      const activity = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      const channels = (activity?.topChannels || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(ch => ({ channelId: ch.channelId, name: ch.channelName || 'Nieznany', count: ch.count }));
      res.json({ success: true, channels });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu top-channels: ${err.message}`, 'activity');
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/top-users', async (req, res) => {
    try {
      const activity = await Activity.findOne({ guildId: req.params.guildId, date: getToday() });
      const users = (activity?.topUsers || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(u => ({ id: u.userId, username: u.username, avatar: u.avatar, count: u.count }));
      res.json({ success: true, users });
    } catch (err) {
      logger.activity('error', `[API] Błąd odczytu top-users: ${err.message}`, 'activity');
      res.status(500).json({ success: false, error: err.message });
    }
  });

  logger.system('info', 'Moduł activity załadowany', 'activity');
};