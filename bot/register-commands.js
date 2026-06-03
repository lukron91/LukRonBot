require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Rejestrowanie ${commands.length} komend globalnie...`);
    
    const clientId = process.env.DISCORD_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('Brak DISCORD_CLIENT_ID w pliku .env!');
    }
    
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    
    console.log(`✅ Zarejestrowano komendy globalnie na wszystkich serwerach!`);
    console.log(`⏰ Komendy mogą pojawić się po około 1 godzinie (czasami szybciej)`);
  } catch (error) {
    console.error('❌ Błąd rejestracji:', error);
  }
})();