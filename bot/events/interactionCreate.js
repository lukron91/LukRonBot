module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client, db) {
    // Komendy slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, db);
      } catch (error) {
        console.error(error);
        const errorMessage = { content: '❌ Wystąpił błąd podczas wykonywania tej komendy!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // Autocomplete (dla admin-commands)
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        await command.autocomplete(interaction);
      }
    }

    // Buttony (później dla ticketów)
    if (interaction.isButton()) {
      // TODO: obsługa przycisków
    }
  }
};