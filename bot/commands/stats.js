const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Wyświetla statystyki bota'),
  async execute(interaction, db) {
    const guildId = interaction.guild.id;
    
    let stats = await db.collection('stats').findOne({ guildId });
    
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle(`📊 Statystyki - ${interaction.guild.name}`)
      .addFields(
        { name: 'Użyte komendy', value: String(stats?.commandsUsed || 0), inline: true },
        { name: 'Utworzone tickety', value: String(stats?.ticketsCreated || 0), inline: true },
        { name: 'Zmoderowane wiadomości', value: String(stats?.messagesModerated || 0), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};