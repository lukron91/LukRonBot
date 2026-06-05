const mongoose = require('mongoose');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule('activity', false, 'Statystyki aktywności serwera');

  // Schemat MongoDB dla statystyk
  const ActivitySchema = new mongoose.Schema({
    guildId: String,
    date: Date,
    messages: { type: Number, default: 0 },
    membersJoined: { type: Number, default: 0 },
    membersLeft: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    topChannels: [{ 
      channelId: String, 
      channelName: String,  // DODANO: nazwa kanału
      count: Number 
    }],
    topUsers: [{ 
      userId: String, 
      username: String, 
      avatar: String,  // DODANO: avatar użytkownika
      count: Number 
    }]
  });

  const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);

  // Event: nowa wiadomość
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
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

      // Top kanały - teraz z nazwą
      const channelIndex = activity.topChannels.findIndex(c => c.channelId === message.channel.id);
      if (channelIndex >= 0) {
        activity.topChannels[channelIndex].count += 1;
        // Aktualizuj nazwę jeśli się zmieniła
        activity.topChannels[channelIndex].channelName = message.channel.name;
      } else {
        activity.topChannels.push({ 
          channelId: message.channel.id, 
          channelName: message.channel.name,
          count: 1 
        });
      }

      // Top użytkownicy - teraz z avatarem
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
    } catch (err) {
      console.error('[Activity] Błąd zapisu wiadomości:', err);
    }
  });

  // Event: nowy członek
  client.on('guildMemberAdd', async (member) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let activity = await Activity.findOne({ guildId: member.guild.id, date: today });

      if (!activity) {
        activity = new Activity({ guildId: member.guild.id, date: today, membersJoined: 0 });
      }

      activity.membersJoined += 1;
      await activity.save();
    } catch (err) {
      console.error('[Activity] Błąd zapisu nowego członka:', err);
    }
  });

  // Event: członek opuszcza serwer
  client.on('guildMemberRemove', async (member) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let activity = await Activity.findOne({ guildId: member.guild.id, date: today });

      if (!activity) {
        activity = new Activity({ guildId: member.guild.id, date: today, membersLeft: 0 });
      }

      activity.membersLeft += 1;
      await activity.save();
    } catch (err) {
      console.error('[Activity] Błąd zapisu opuszczenia członka:', err);
    }
  });

  // Endpointy API
  app.get('/api/guilds/:guildId/activity/joined-today', async (req, res) => {
    try {
      const { guildId } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ guildId, date: today });
      res.json({ success: true, count: activity?.membersJoined || 0 });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/left-today', async (req, res) => {
    try {
      const { guildId } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ guildId, date: today });
      res.json({ success: true, count: activity?.membersLeft || 0 });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/active-7days', async (req, res) => {
    try {
      const { guildId } = req.params;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activities = await Activity.find({
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
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/trend', async (req, res) => {
    try {
      const { guildId } = req.params;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activities = await Activity.find({
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
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/top-channels', async (req, res) => {
    try {
      const { guildId } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ guildId, date: today });
      
      const sortedChannels = (activity?.topChannels || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(ch => ({
          channelId: ch.channelId,
          name: ch.channelName || 'Nieznany kanał',  // Zwracamy jako 'name' dla panelu
          count: ch.count
        }));

      res.json({ success: true, channels: sortedChannels });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/activity/top-users', async (req, res) => {
    try {
      const { guildId } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activity = await Activity.findOne({ guildId, date: today });
      
      const sortedUsers = (activity?.topUsers || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(user => ({
          id: user.userId,  // Zwracamy jako 'id' dla panelu
          username: user.username,
          avatar: user.avatar,
          count: user.count
        }));

      res.json({ success: true, users: sortedUsers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('[Activity] Moduł załadowany - nasłuchuję eventów Discorda');
};