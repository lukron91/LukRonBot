const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Wycisz użytkownika (timeout)')
    .addUserOption(opt => opt.setName('użytkownik').setDescription('Użytkownik do wyciszenia').setRequired(true))
    .addIntegerOption(opt => opt.setName('minuty').setDescription('Czas wyciszenia w minutach').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(opt => opt.setName('powód').setDescription('Powód wyciszenia').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('użytkownik');
    const minutes = interaction.options.getInteger('minuty');
    const reason = interaction.options.getString('powód') || 'Brak powodu';

    if (!target) return interaction.reply({ content: '❌ Nie znaleziono użytkownika.', ephemeral: true });

    try {
      await target.timeout(minutes * 60 * 1000, reason);
      await interaction.reply({ content: `✅ Wyciszono **${target.user.tag}** na **${minutes} minut**\nPowód: ${reason}` });
    } catch (e) {
      await interaction.reply({ content: `❌ Nie można wyciszyć: ${e.message}`, ephemeral: true });
    }
  }
};
