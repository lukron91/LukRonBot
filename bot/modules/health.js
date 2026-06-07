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
    return ((totalTick - totalIdle) / totalTick) * 100;
  }

  app.get('/bot/health', (req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const ping = Math.round(client.ws.ping);
    const guildCount = client.guilds.cache.size;
    const cpuUsage = getCpuUsage();
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

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
      running: true,
      ping,
      uptime,
      guilds: guildCount,
      cpu: cpuUsage.toFixed(2),
      ram: memoryUsage.toFixed(2),
      status: client.user?.presence?.status || 'online',
      customStatus: customStatus || '',
      environment: app.locals.activeDatabase(),
      dbConnected: app.locals.isDbConnected(),
    });
  });

  logger.system('info', 'Moduł health załadowany', 'health');
};