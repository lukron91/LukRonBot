require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Inicjalizacja klienta z niezbędnymi intencjami (uprawnieniami do odczytu)
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Kolekcja do przechowywania załadowanych komend
client.commands = new Collection();

// Ładowanie komend z folderu commands/
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] Komenda w pliku ${file} nie posiada wymaganych pól 'data' lub 'execute'.`);
    }
}

// Obsługa interakcji (komend slash)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`Nie znaleziono komendy: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const reply = interaction.replied || interaction.deferred 
            ? interaction.followUp({ content: 'Wystąpił błąd podczas wykonywania tej komendy.', ephemeral: true })
            : interaction.reply({ content: 'Wystąpił błąd podczas wykonywania tej komendy.', ephemeral: true });
    }
});

// Uruchomienie bota
client.login(process.env.DISCORD_TOKEN);
console.log('Bot jest uruchamiany...');