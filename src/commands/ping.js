const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Sprawdź czy bot działa'),
  async execute(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({
      content: `🏓 Pong! Latencja: **${latency}ms** | API: **${interaction.client.ws.ping}ms**`,
      ephemeral: true
    });
  }
};
