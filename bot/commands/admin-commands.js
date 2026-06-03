const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-commands')
    .setDescription('Zarządzanie komendami bota')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Wyświetla wszystkie zarejestrowane komendy')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Usuwa konkretną komendę')
        .addStringOption(option =>
          option.setName('command')
            .setDescription('Nazwa komendy do usunięcia')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('refresh')
        .setDescription('Przeładowuje wszystkie komendy z plików')
    ),
  
  async execute(interaction, db) {
    const subcommand = interaction.options.getSubcommand();
    const { REST, Routes } = require('discord.js');
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (subcommand === 'list') {
      // Wyświetl wszystkie komendy
      const commands = await rest.get(Routes.applicationCommands(clientId));
      
      const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('📋 Zarejestrowane komendy')
        .setDescription(commands.length > 0 
          ? commands.map(cmd => `\`/${cmd.name}\` - ${cmd.description}`).join('\n')
          : 'Brak zarejestrowanych komend'
        )
        .setFooter({ text: `Łącznie: ${commands.length} komend` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'delete') {
      // Usuń konkretną komendę
      const commandName = interaction.options.getString('command');
      const commands = await rest.get(Routes.applicationCommands(clientId));
      const command = commands.find(cmd => cmd.name === commandName);

      if (!command) {
        return await interaction.reply({ 
          content: '❌ Nie znaleziono takiej komendy!', 
          ephemeral: true 
        });
      }

      await rest.delete(Routes.applicationCommand(clientId, command.id));
      
      await interaction.reply({
        content: `✅ Usunięto komendę \`${commandName}\`. Zmiany mogą być widoczne po ~1 godzinie.`,
        ephemeral: true
      });

    } else if (subcommand === 'refresh') {
      // Przeładuj komendy z plików
      await interaction.deferReply({ ephemeral: true });

      try {
        // Usuń stare komendy
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        
        // Załaduj nowe z plików
        const commands = [];
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && file !== 'admin-commands.js');

        for (const file of commandFiles) {
          const filePath = path.join(commandsPath, file);
          const command = require(filePath);
          if ('data' in command) {
            commands.push(command.data.toJSON());
          }
        }

        // Zarejestruj nowe
        await rest.put(Routes.applicationCommands(clientId), { body: commands });

        await interaction.editReply({
          content: `✅ Przeładowano ${commands.length} komend! Mogą być widoczne po ~1 godzinie.`
        });
      } catch (error) {
        console.error('Refresh error:', error);
        await interaction.editReply({
          content: '❌ Błąd podczas przeładowywania komend!'
        });
      }
    }
  },
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const { REST, Routes } = require('discord.js');
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const clientId = process.env.DISCORD_CLIENT_ID;

    const commands = await rest.get(Routes.applicationCommands(clientId));
    const filtered = commands.filter(cmd => cmd.name.startsWith(focusedValue)).slice(0, 25);

    await interaction.respond(
      filtered.map(cmd => ({ name: `/${cmd.name}`, value: cmd.name }))
    );
  },
};