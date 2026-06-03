const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Sprawdza ping bota'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pong!', fetchReply: true });
    const ping = sent.createdTimestamp - interaction.createdTimestamp;
    
    await interaction.editReply({
      content: `🏓 Pong!\nPing API: ${Math.round(interaction.client.ws.ping)}ms\nPing komendy: ${ping}ms`
    });
  },
};