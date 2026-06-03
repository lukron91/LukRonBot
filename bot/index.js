require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

client.commands = new Collection();

// Połączenie z MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URI);
let db;

// Ładowanie komend z folderu commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Załadowano komendę: ${command.data.name}`);
  } else {
    console.log(`️ Pominięto: ${file} (brak data lub execute)`);
  }
}

// Ładowanie eventów z folderu events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if ('name' in event && 'execute' in event) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client, db));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client, db));
    }
    console.log(`✅ Załadowano event: ${event.name}`);
  } else {
    console.log(`⚠️ Pominięto event: ${file}`);
  }
}

// Logowanie błędów
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Uruchomienie
(async () => {
  try {
    await mongoClient.connect();
    db = mongoClient.db('LukRonBot');
    console.log('✅ Połączono z MongoDB');
  } catch (err) {
    console.error('❌ Błąd MongoDB:', err.message);
    process.exit(1);
  }

  client.login(process.env.DISCORD_TOKEN);
})();