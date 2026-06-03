module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client, db) {
    try {
      const config = await db.collection('configs').findOne({ guildId: member.guild.id });
      if (!config?.welcome?.channelId || !config.welcome.message) return;

      const channel = await member.guild.channels.fetch(config.welcome.channelId).catch(() => null);
      if (!channel) return;

      const welcomeMsg = config.welcome.message
        .replace('{user}', `<@${member.id}>`)
        .replace('{guild}', member.guild.name);

      await channel.send({ content: welcomeMsg });
    } catch (err) {
      console.error('Błąd welcome:', err);
    }
  }
};