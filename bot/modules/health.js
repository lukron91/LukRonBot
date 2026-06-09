const os = require('os');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Status i statystyki bota');

  const logger = app.locals.logger;
  const startTime = Date.now();

  function getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) totalTick += cpu.times[type];
      totalIdle += cpu.times.idle;
    }
    return totalTick === 0 ? "0.00" : ((totalTick - totalIdle) / totalTick * 100).toFixed(2);
  }

  app.get('/api/bot/health', (req, res) => {
    try {
      const isReady = client.isReady();
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const ping = isReady && client.ws ? Math.round(client.ws.ping) : 0;
      const guildCount = isReady ? client.guilds.cache.size : 0;
      const cpuUsage = getCpuUsage();
      const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

      let customStatus = '';
      try {
        const fs = require('fs');
        const path = require('path');
        const statusFile = path.join(__dirname, '..', 'status.json');
        if (fs.existsSync(statusFile)) {
          const data = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
          customStatus = data.customStatus || '';
        }
      } catch (err) {}

      res.json({
        running: isReady,
        ping: ping,
        uptime: uptime,
        guilds: guildCount,
        cpu: cpuUsage,
        ram: memoryUsage,
        status: isReady ? (client.user?.presence?.status || 'online') : 'offline',
        customStatus: customStatus,
        environment: app.locals.activeDatabase ? app.locals.activeDatabase() : 'unknown',
        dbConnected: app.locals.isDbConnected ? app.locals.isDbConnected() : false,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  logger.system('info', 'Moduł health załadowany', 'health');
};
