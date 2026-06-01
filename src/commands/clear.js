const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Usuń wiadomości z kanału')
    .addIntegerOption(opt => opt.setName('ilość').setDescription('Liczba wiadomości do usunięcia (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger('ilość');
    try {
      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply({ content: `✅ Usunięto **${deleted.size}** wiadomości.` });
    } catch (e) {
      await interaction.editReply({ content: `❌ Błąd: ${e.message}` });
    }
  }
};
