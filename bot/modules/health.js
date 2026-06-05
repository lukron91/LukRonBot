const { ActivityType } = require('discord.js');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Moduł zdrowia bota – endpoint /bot/health');

  app.get('/bot/health', (req, res) => {
    try {
      const guildCount = client.guilds.cache.size;
      const ping = client.ws.ping;
      const uptime = process.uptime();
      const cpuUsage = process.cpuUsage().user / 1000000;
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      const activities = client.user?.presence?.activities || [];
      const customActivity = activities.find(a => a.type === ActivityType.Custom);
      const customStatus = customActivity ? customActivity.state || customActivity.name : null;
      res.json({
        running: true,
        ping,
        uptime,
        guilds: guildCount,
        cpu: cpuUsage.toFixed(2),
        ram: memoryUsage.toFixed(2),
        status: client.user?.presence?.status || 'online',
        customStatus: customStatus || ''
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Opcjonalnie: zwróć obiekt z funkcją unload (jeśli trzeba posprzątać)
  return {
    unload: () => {
      console.log(`[health] Moduł ${moduleName} rozładowany`);
    }
  };
};