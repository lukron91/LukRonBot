module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName);
  const logger = app.locals.logger;
  if (logger) logger.activity('info', 'Moduł commands załadowany (placeholder)', moduleName);
  // Tutaj później dodasz komendy slash
};

module.exports.description = `Moduł komend – miejsce na rejestrację komend slash (np. ping, say, warn, mute, ban). Obecnie zawiera tylko szkielet.`;