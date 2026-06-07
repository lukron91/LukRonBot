const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Zarządzanie Komendami Slash');
  
  const logger = app.locals.logger;
  const commandsPath = path.join(__dirname, '../commands');

  if (!client.commands) {
    client.commands = new Collection();
  }

  // --- LOGIKA ŁADOWANIA DO PAMIĘCI ---
  async function loadCommandsToMemory() {
    try {
      if (!fs.existsSync(commandsPath)) {
        logger.system('warn', 'Folder bot/commands nie istnieje.', 'commands');
        return;
      }

      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
        }
      }
      logger.system('info', `Załadowano ${client.commands.size} komend do pamięci bota.`, 'commands');
    } catch (error) {
      logger.system('error', `Błąd ładowania komend: ${error.message}`, 'commands');
    }
  }

  // --- HANDLER INTERAKCJI (Słuchacz) ---
  if (!client.commandsLoaded) {
    client.on('interactionCreate', async interaction => {
      if (!interaction.isChatInputCommand()) return;
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.system('error', `Błąd wykonania ${interaction.commandName}: ${error.message}`, 'commands');
        const msg = { content: 'Błąd podczas wykonywania komendy!', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
        else await interaction.reply(msg);
      }
    });
    client.commandsLoaded = true;
  }

  // --- ENDPOINTY API DLA PANELU ---

  // 1. Lista załadowanych komend
  app.get('/api/commands', (req, res) => {
    logger.system('debug', 'Otrzymano zapytanie o listę komend', 'commands');
    const commandsList = [];
    if (!client.commands) {
      logger.system('warn', 'Kolekcja client.commands nie istnieje!', 'commands');
      return res.json({ commands: [], error: 'Kolekcja komend nie zainicjalizowana' });
    }
    client.commands.forEach(cmd => {
      commandsList.push({
        name: cmd.data.name,
        description: cmd.data.description
      });
    });
    logger.system('debug', `Zwrócono ${commandsList.length} komend z pamięci bota`, 'commands');
    res.json({ commands: commandsList });
  });

  // 2. Rejestracja komend
  app.post('/api/commands/register', async (req, res) => {
    const { type, guildId, commandName } = req.body; // type: 'global' | 'guild', commandName: optional (single command)

    try {
      let commandsToRegister = [];

      if (commandName) {
        const cmd = client.commands.get(commandName);
        if (!cmd) return res.status(404).json({ error: 'Komenda nie znaleziona w pamięci bota' });
        commandsToRegister.push(cmd.data.toJSON());
      } else {
        client.commands.forEach(cmd => commandsToRegister.push(cmd.data.toJSON()));
      }

      if (type === 'global') {
        await client.application.commands.set(commandsToRegister);
        logger.system('info', `Zarejestrowano ${commandsToRegister.length} komend globalnie.`, 'commands');
      } else if (type === 'guild' && guildId) {
        const guild = await client.guilds.fetch(guildId);
        await guild.commands.set(commandsToRegister);
        logger.system('info', `Zarejestrowano ${commandsToRegister.length} komend na serwerze ${guildId}.`, 'commands');
      } else {
        return res.status(400).json({ error: 'Brak guildId dla rejestracji serwerowej' });
      }

      res.json({ success: true, count: commandsToRegister.length, type });
    } catch (err) {
      logger.system('error', `Błąd rejestracji: ${err.message}`, 'commands');
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Usuwanie komend
  app.post('/api/commands/unregister', async (req, res) => {
    const { type, guildId, commandName } = req.body;

    try {
      if (type === 'global') {
        if (commandName) {
          await client.application.commands.delete(commandName);
          logger.system('info', `Usunięto komendę globalną: ${commandName}`, 'commands');
        } else {
          await client.application.commands.set([]);
          logger.system('info', `Wyczyszczono wszystkie komendy globalne.`, 'commands');
        }
      } else if (type === 'guild' && guildId) {
        const guild = await client.guilds.fetch(guildId);
        if (commandName) {
          await guild.commands.delete(commandName);
          logger.system('info', `Usunięto komendę ${commandName} z serwera ${guildId}.`, 'commands');
        } else {
          await guild.commands.set([]);
          logger.system('info', `Wyczyszczono wszystkie komendy na serwerze ${guildId}.`, 'commands');
        }
      } else {
        return res.status(400).json({ error: 'Brak guildId dla usuwania serwerowego' });
      }
      res.json({ success: true });
    } catch (err) {
      logger.system('error', `Błąd usuwania: ${err.message}`, 'commands');
      res.status(500).json({ error: err.message });
    }
  });

  // Inicjalne ładowanie do pamięci
  loadCommandsToMemory();

  logger.system('info', 'Moduł Command Manager (API) załadowany.', 'commands');
};

module.exports.description = 'Zarządza ładowaniem komend do pamięci i udostępnia API do rejestracji komend slash w Discord.';
