module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  registerModule(moduleName, false, 'Moduł testowy – endpoint GET /debug/test do sprawdzania działania modułów');
  
  const logger = app.locals.logger;

  // Endpoint testowy
  app.get('/debug/test', (req, res) => {
    res.json({ success: true, message: 'Test OK: moduł debug działa' });
  });
  
  logger.system('info', 'Moduł debug załadowany', 'debug');
  
  // Opcjonalna funkcja czyszczenia (przy przeładowaniu)
  return {
    unload: () => {
      logger.system('info', 'Moduł debug rozładowany', 'debug');
    }
  };
};