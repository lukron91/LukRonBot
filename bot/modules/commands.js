module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Moduł komend – miejsce na rejestrację komend slash.');
  
  const logger = app.locals.logger;
  logger.system('info', 'Moduł commands załadowany', 'commands');
  
  // Tutaj później dodasz komendy slash
};
module.exports.description = `Moduł komend – miejsce na rejestrację komend slash (np. ping, say, warn, mute, ban). Obecnie zawiera tylko szkielet.`;