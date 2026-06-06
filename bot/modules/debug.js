// bot/modules/debug.js
module.exports = (app, client, registerModule, unregisterModule, moduleName) => {
  // Rejestracja modułu (opcjonalny, nie wymagany dla działania bota)
  registerModule(moduleName, false, 'Moduł testowy – endpoint GET /debug/test do sprawdzania działania modułów');
  
  // Endpoint testowy
  app.get('/debug/test', (req, res) => {
    res.json({ success: true, message: 'Test OK: moduł debug działa' });
  });
  
  app.locals.logger.system('info', 'Moduł debug załadowany', 'debug');
  
  // Opcjonalna funkcja czyszczenia (przy przeładowaniu)
  return {
    unload: () => {
      app.locals.logger.system('info', 'Moduł debug rozładowany', 'debug');
    }
  };
};