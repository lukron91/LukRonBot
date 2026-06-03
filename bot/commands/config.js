const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Wyświetla link do panelu konfiguracyjnego'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('⚙️ Panel konfiguracyjny')
      .setDescription('Skonfiguruj bota przez panel webowy!')
      .addFields({
        name: '🔗 Link',
        value: `[Kliknij tutaj aby otworzyć panel](https://lukronbot.vercel.app/dashboard)`
      })
      .setFooter({ text: 'Musisz być zalogowany przez Discord' });

    await interaction.reply({ embeds: [embed] });
  },
};