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

  // 1. Lista komend w pamięci bota (z folderu commands/)
  app.get('/api/commands', (req, res) => {
    logger.system('debug', 'Otrzymano zapytanie o listę komend w pamięci', 'commands');
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

  // 2. Lista komend zarejestrowanych GLOBALNIE w Discordzie
  app.get('/api/commands/registered-global', async (req, res) => {
    try {
      const globalCmds = await client.application.commands.fetch();
      const list = globalCmds.map(cmd => ({ name: cmd.name, description: cmd.description }));
      res.json({ commands: list });
    } catch (err) {
      logger.system('error', `Błąd pobierania komend globalnych: ${err.message}`, 'commands');
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Lista komend zarejestrowanych na KONKRETNYM SERWERZE w Discordzie
  app.get('/api/commands/registered-guild/:guildId', async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = await client.guilds.fetch(guildId);
      const guildCmds = await guild.commands.fetch();
      const list = guildCmds.map(cmd => ({ name: cmd.name, description: cmd.description }));
      res.json({ commands: list });
    } catch (err) {
      logger.system('error', `Błąd pobierania komend serwera ${guildId}: ${err.message}`, 'commands');
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Rejestracja komend
  app.post('/api/commands/register', async (req, res) => {
    const { type, guildId, commandNames } = req.body; // type: 'global' | 'guild', commandNames: array of strings

    try {
      let commandsToRegister = [];

      if (commandNames && Array.isArray(commandNames) && commandNames.length > 0) {
        // Rejestrujemy tylko wybrane komendy
        for (const name of commandNames) {
          const cmd = client.commands.get(name);
          if (cmd) commandsToRegister.push(cmd.data.toJSON());
        }
      } else {
        // Rejestrujemy wszystkie z pamięci
        client.commands.forEach(cmd => commandsToRegister.push(cmd.data.toJSON()));
      }

      if (commandsToRegister.length === 0) {
        return res.status(400).json({ error: 'Brak komend do zarejestrowania' });
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

  // 5. Usuwanie komend
  app.post('/api/commands/unregister', async (req, res) => {
    const { type, guildId, commandNames } = req.body;

    try {
      if (type === 'global') {
        if (commandNames && Array.isArray(commandNames) && commandNames.length > 0) {
          for (const name of commandNames) {
            await client.application.commands.delete(name);
          }
          logger.system('info', `Usunięto wybrane komendy globalne: ${commandNames.join(', ')}`, 'commands');
        } else {
          await client.application.commands.set([]);
          logger.system('info', `Wyczyszczono wszystkie komendy globalne.`, 'commands');
        }
      } else if (type === 'guild' && guildId) {
        logger.system('debug', `Próba usunięcia komend z serwera ${guildId}. Lista: ${commandNames ? commandNames.join(', ') : 'Wszystkie'}`, 'commands');
        const guild = await client.guilds.fetch(guildId);
        if (commandNames && Array.isArray(commandNames) && commandNames.length > 0) {
          for (const name of commandNames) {
            await guild.commands.delete(name);
          }
          logger.system('info', `Usunięto wybrane komendy z serwera ${guildId}: ${commandNames.join(', ')}`, 'commands');
        } else {
          await guild.commands.set([]);
          logger.system('info', `Wyczyszczono wszystkie komendy na serwerze ${guildId}.`, 'commands');
        }
      } else {
        logger.system('warn', `Błąd usuwania: brak guildId dla typu guild. Typ: ${type}`, 'commands');
        return res.status(400).json({ error: 'Brak guildId dla usuwania serwerowego' });
      }
      res.json({ success: true });
    } catch (err) {
      logger.system('error', `Krytyczny błąd usuwania: ${err.message}`, 'commands');
      res.status(500).json({ error: err.message });
    }
  });

  // Inicjalne ładowanie do pamięci
  loadCommandsToMemory();

  logger.system('info', 'Moduł Command Manager (API) załadowany.', 'commands');
};

module.exports.description = 'Zarządza ładowaniem komend do pamięci i udostępnia API do rejestracji komend slash w Discord.';
