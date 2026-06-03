module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client, db) {
    console.log(` ${client.user.tag} jest online!`);
    console.log(`📊 ${client.guilds.cache.size} serwerów`);

    client.user.setPresence({
      activities: [{ name: '/help | LukRon Bot', type: 2 }],
      status: 'online'
    });
  }
};