const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule('activity', false, 'Statystyki aktywności serwera');
  
  const logger = app.locals.logger;
  const getActiveEnv = () => app.locals.activeDatabase ? app.locals.activeDatabase() : 'main';

  // Schemat MongoDB dla statystyk
  const ActivitySchema = new mongoose.Schema({
    environment: { type: String, required: true, enum: ['main', 'test'] },
    guildId: String,
    date: Date,
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
  }, { timestamps: true });

  const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);

  // Event: nowa wiadomość (logujemy TYLKO błędy)
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    const env = getActiveEnv();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let activity = await Activity.findOne({ environment: env, guildId: message.guild.id, date: today });

      if (!activity) {
        activity = new Activity({
          environment: env,
          guildId: message.guild.id,
          date: today,
          messages: 0,
          topChannels: [],
          topUsers: []
        });
      }

      activity.messages += 1;

      const channelIndex = activity.topChannels.findIndex(c => c.channelId === message.channel.id);
      if (channelIndex >= 0) {
        activity.topChannels[channelIndex].count += 1;
        activity.topChannels[channelIndex].channelName = message.channel.name;
      } else {
        activity.topChannels.push({
          channelId: message.channel.id,
          channelName: message.channel.name,
          count: 1
        });
      }

      const userIndex = activity.topUsers.findIndex(u => u.userId === message.author.id);
      if (userIndex >= 0) {
        activity.topUsers[userIndex].count += 1;
      } else {
        activity.topUsers.push({
          userId: message.author.id,
          username: message.author.username,
          avatar: message.author.avatar,
          count: 1
        });
      }

      await activity.save();
      // NIE logujemy każdego message - to zaśmieci logi
    } catch (err) {
      logger.activity('error', `Błąd zapisu wiadomości w kanale ${message.channel.id}: ${err.message}`, 'activity');
    }
  });

  // Event: nowy członek (logujemy info)
  client.on('guildMemberAdd', async (member) => {
    const env = getActiveEnv();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let activity = await Activity.findOne({ environment: env, guildId: member.guild.id, date: today });

      if (!activity) {
        activity = new Activity({ environment: env, guildId: member.guild.id, date: today, membersJoined: 0 });
      }

      activity.membersJoined += 1;
      await activity.save();
      
      logger.activity('info', `Użytkownik ${member.user.tag} dołączył do serwera`, 'activity');
    } catch (err) {
      logger.activity('error', `Błąd zapisu nowego członka: ${err.message}`, 'activity');
    }
  });

  // Event: członek opuszcza serwer (logujemy info)
  client.on('guildMemberRemove', async (member) => {
    const env = getActiveEnv();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let activity = await Activity.findOne({ environment: env, guildId: member.guild.id, date: today });

      if (!activity) {
        activity = new Activity({ environment: env, guildId: member.guild.id, date: today, membersLeft: 0 });
      }

      activity.membersLeft += 1;
      await activity.save();
      
      logger.activity('info', `Użytkownik ${member.user.tag} opuścił serwer`, 'activity');
    } catch (err) {
      logger.activity('error', `Błąd zapisu opuszczenia członka: ${err.message}`, 'activity');
    }
  });

  // Endpointy API z logowaniem
  app.get('/api/guilds/:guildId/activity/joined-today', async (req, res) => {
    try {
      const { guildId } = req.params;
      const env = getActiveEnv();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ environment: env, guildId, date: today });
      res.json({ success: true, count: activity?.membersJoined || 0 });
    } catch (error) {
      logger.activity('error', `[API] Błąd odczytu joined-today dla ${req.params.guildId}: ${error.message}`, 'activity');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/left-today', async (req, res) => {
    try {
      const { guildId } = req.params;
      const env = getActiveEnv();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ environment: env, guildId, date: today });
      res.json({ success: true, count: activity?.membersLeft || 0 });
    } catch (error) {
      logger.activity('error', `[API] Błąd odczytu left-today dla ${req.params.guildId}: ${error.message}`, 'activity');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/active-7days', async (req, res) => {
    try {
      const { guildId } = req.params;
      const env = getActiveEnv();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activities = await Activity.find({
        environment: env,
        guildId,
        date: { $gte: sevenDaysAgo }
      });

      const uniqueUsers = new Set();
      activities.forEach(act => {
        act.topUsers.forEach(user => {
          uniqueUsers.add(user.userId);
        });
      });

      res.json({ success: true, count: uniqueUsers.size });
    } catch (error) {
      logger.activity('error', `[API] Błąd odczytu active-7days dla ${req.params.guildId}: ${error.message}`, 'activity');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/trend', async (req, res) => {
    try {
      const { guildId } = req.params;
      const env = getActiveEnv();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activities = await Activity.find({
        environment: env,
        guildId,
        date: { $gte: sevenDaysAgo }
      }).sort({ date: 1 });

      const trend = activities.map(act => {
        const date = new Date(act.date);
        const dayLabel = date.toLocaleDateString('pl-PL', { weekday: 'short' }).slice(0, 3);
        return {
          label: dayLabel,
          count: act.messages
        };
      });

      res.json({ success: true, trend });
    } catch (error) {
      logger.activity('error', `[API] Błąd odczytu trend dla ${req.params.guildId}: ${error.message}`, 'activity');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/top-channels', async (req, res) => {
    try {
      const { guildId } = req.params;
      const env = getActiveEnv();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ environment: env, guildId, date: today });

      const sortedChannels = (activity?.topChannels || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(ch => ({
          channelId: ch.channelId,
          name: ch.channelName || 'Nieznany kanał',
          count: ch.count
        }));

      res.json({ success: true, channels: sortedChannels });
    } catch (error) {
      logger.activity('error', `[API] Błąd odczytu top-channels dla ${req.params.guildId}: ${error.message}`, 'activity');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/top-users', async (req, res) => {
    try {
      const { guildId } = req.params;
      const env = getActiveEnv();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ environment: env, guildId, date: today });

      const sortedUsers = (activity?.topUsers || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(user => ({
          id: user.userId,
          username: user.username,
          avatar: user.avatar,
          count: user.count
        }));

      res.json({ success: true, users: sortedUsers });
    } catch (error) {
      logger.activity('error', `[API] Błąd odczytu top-users dla ${req.params.guildId}: ${error.message}`, 'activity');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  logger.system('info', 'Moduł activity załadowany', 'activity');
};