const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Wyrzuć użytkownika z serwera')
    .addUserOption(opt => opt.setName('użytkownik').setDescription('Użytkownik do wyrzucenia').setRequired(true))
    .addStringOption(opt => opt.setName('powód').setDescription('Powód kicka').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('użytkownik');
    const reason = interaction.options.getString('powód') || 'Brak powodu';

    if (!target) return interaction.reply({ content: '❌ Nie znaleziono użytkownika.', ephemeral: true });

    try {
      await target.kick(reason);
      await interaction.reply({ content: `✅ Wyrzucono **${target.user.tag}**\nPowód: ${reason}` });
    } catch (e) {
      await interaction.reply({ content: `❌ Nie można wyrzucić: ${e.message}`, ephemeral: true });
    }
  }
};
