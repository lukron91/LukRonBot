const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageDelete',
  async execute(message, client, db) {
    if (message.author?.bot) return;
    if (!message.guild) return;

    try {
      const config = await db.collection('configs').findOne({ guildId: message.guild.id });
      if (!config?.logs?.channelId || !config.logs.logDeletes) return;

      const logChannel = await message.guild.channels.fetch(config.logs.channelId).catch(() => null);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor('#ed4245')
        .setTitle('🗑️ Usunięto wiadomość')
        .addFields(
          { name: 'Autor', value: message.author?.tag || 'Nieznany', inline: true },
          { name: 'Kanał', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Treść', value: message.content || '(brak treści)' }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // ignoruj
    }
  }
};