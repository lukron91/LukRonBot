module.exports = {
  name: 'messageCreate',
  async execute(message, client, db) {
    if (message.author.bot) return;
    if (!message.guild) return;


    // Automatyczna moderacja (czyta konfigurację z bazy)
    try {
      const config = await db.collection('configs').findOne({ guildId: message.guild.id });
      if (!config) return;

      // Anti-links
      if (config.automod?.antiLinks && /https?:\/\/\S+/.test(message.content)) {
        await message.delete().catch(() => {});
        const msg = await message.channel.send(` ${message.author}, linki są zabronione!`);
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        return;
      }

      // Anti-bad words
      if (config.automod?.antiBadWords && Array.isArray(config.automod.badWords)) {
        const badWord = config.automod.badWords.find(word =>
          message.content.toLowerCase().includes(word.toLowerCase())
        );
        if (badWord) {
          await message.delete().catch(() => {});
          const msg = await message.channel.send(`⛔ ${message.author}, to słowo jest zabronione!`);
          setTimeout(() => msg.delete().catch(() => {}), 5000);
          return;
        }
      }

      // Anti-spam (placeholder - później rozbudujemy)
      if (config.automod?.antiSpam) {
        // TODO: implementacja anti-spam
      }

    } catch (err) {
      console.error('Błąd automod:', err);
    }
  }
};