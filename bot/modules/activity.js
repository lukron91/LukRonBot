// bot/modules/activity.js
module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Moduł aktywności – statystyki serwera (dołączenia, wiadomości, trendy)');

  // Prosta pamięć dla statystyk (w czasie rzeczywistym)
  const stats = new Map(); // guildId -> { joinsToday, leavesToday, messages7d, trend, topChannels, topUsers }

  // Funkcje pomocnicze
  function getTodayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // Endpointy (zwracają przykładowe dane – dla testów)
  app.get('/api/guilds/:guildId/activity/joined-today', (req, res) => {
    res.json({ count: Math.floor(Math.random() * 5) }); // losowa liczba 0-4
  });

  app.get('/api/guilds/:guildId/activity/left-today', (req, res) => {
    res.json({ count: Math.floor(Math.random() * 3) });
  });

  app.get('/api/guilds/:guildId/activity/active-7days', (req, res) => {
    res.json({ count: Math.floor(Math.random() * 50) + 20 });
  });

  app.get('/api/guilds/:guildId/activity/trend', (req, res) => {
    const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trend.push({
        date: d.toISOString().slice(0,10),
        label: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
        count: Math.floor(Math.random() * 100) + 10
      });
    }
    res.json({ trend });
  });

  app.get('/api/guilds/:guildId/activity/top-channels', (req, res) => {
    res.json({ channels: [
      { name: 'ogólny', count: 1245 },
      { name: 'boty', count: 892 },
      { name: 'muzyka', count: 567 },
      { name: 'offtop', count: 345 },
      { name: 'support', count: 234 }
    ]});
  });

  app.get('/api/guilds/:guildId/activity/top-users', (req, res) => {
    res.json({ users: [
      { id: '1', username: 'User1', avatar: null, count: 567 },
      { id: '2', username: 'User2', avatar: null, count: 432 },
      { id: '3', username: 'User3', avatar: null, count: 345 },
      { id: '4', username: 'User4', avatar: null, count: 234 },
      { id: '5', username: 'User5', avatar: null, count: 123 }
    ]});
  });

  console.log('[activity] Moduł aktywności (wersja demonstracyjna) załadowany');
};

module.exports.description = `Moduł aktywności – udostępnia statystyki dla dashboardu (na razie dane przykładowe). W docelowej wersji będzie zbierał rzeczywiste dane z eventów.`;