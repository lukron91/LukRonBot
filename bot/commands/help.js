const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Wyświetla listę dostępnych komend'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle(' LukRon Bot - Pomoc')
      .setDescription('Oto dostępne komendy:')
      .addFields(
        { name: '/ping', value: 'Sprawdza ping bota', inline: true },
        { name: '/help', value: 'Wyświetla tę wiadomość', inline: true },
        { name: '/config', value: 'Link do panelu konfiguracyjnego', inline: true },
        { name: '/stats', value: 'Statystyki serwera', inline: true }
      )
      .setFooter({ text: 'LukRon Bot v1.0' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};