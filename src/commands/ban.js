const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Zbanuj użytkownika')
    .addUserOption(opt => opt.setName('użytkownik').setDescription('Użytkownik do zbanowania').setRequired(true))
    .addStringOption(opt => opt.setName('powód').setDescription('Powód bana').setRequired(false))
    .addIntegerOption(opt => opt.setName('dni').setDescription('Usuń wiadomości z ostatnich X dni (0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('użytkownik');
    const reason = interaction.options.getString('powód') || 'Brak powodu';
    const days = interaction.options.getInteger('dni') || 0;

    try {
      await interaction.guild.members.ban(target, { reason, deleteMessageDays: days });
      await interaction.reply({ content: `✅ Zbanowano **${target.tag}**\nPowód: ${reason}`, ephemeral: false });
    } catch (e) {
      await interaction.reply({ content: `❌ Nie można zbanować: ${e.message}`, ephemeral: true });
    }
  }
};
