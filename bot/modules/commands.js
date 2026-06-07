const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Dynamiczny Loader Komend Slash');
  
  const logger = app.locals.logger;
  const commandsPath = path.join(__dirname, '../commands');

  // 1. Inicjalizacja kolekcji komend, jeśli nie istnieje
  if (!client.commands) {
    client.commands = new Collection();
  }

  // 2. Funkcja ładowania komend z folderu
  async function loadCommands() {
    try {
      if (!fs.existsSync(commandsPath)) {
        logger.system('warn', 'Folder bot/commands nie istnieje. Pomijanie ładowania komend.', 'commands');
        return;
      }

      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      const commandsToRegister = [];

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // Wyczyszczenie cache'u dla tego pliku, aby umożliwić hot-reload
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commandsToRegister.push(command.data.toJSON());
          logger.system('info', `Załadowano komendę: ${command.data.name}`, 'commands');
        } else {
          logger.system('warn', `Plik ${file} nie ma wymaganej struktury (data/execute).`, 'commands');
        }
      }

      // Rejestracja komend w API Discorda
      await client.application.commands.set(commandsToRegister);
      logger.system('info', `Zarejestrowano ${commandsToRegister.length} komend slash w Discord API.`, 'commands');

    } catch (error) {
      logger.system('error', `Błąd podczas ładowania komend: ${error.message}`, 'commands');
    }
  }

  // 3. Obsługa interakcji (Slash Commands)
  // Używamy flagi, aby nie dodawać wielokrotnie tego samego listenera przy reloadzie modułu
  if (!client.commandsLoaded) {
    client.on('interactionCreate', async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.system('warn', `Otrzymano nieznaną komendę: ${interaction.commandName}`, 'commands');
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.system('error', `Błąd wykonania komendy ${interaction.commandName}: ${error.message}`, 'commands');
        const errorMessage = { content: 'Wystąpił błąd podczas wykonywania tej komendy!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });
    client.commandsLoaded = true;
  }

  // Wywołanie ładowania
  loadCommands();

  logger.system('info', 'Moduł Dynamic Command Loader załadowany i aktywny.', 'commands');
};

module.exports.description = 'Dynamicznie ładuje pliki .js z folderu bot/commands/ i rejestruje je jako Slash Commands w Discord.';
