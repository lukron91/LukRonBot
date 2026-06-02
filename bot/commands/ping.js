const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Sprawdza opóźnienie bota.'),
    async execute(interaction) {
        await interaction.reply(`Pong! Opóźnienie wynosi ${Date.now() - interaction.createdTimestamp}ms.`);
    },
};