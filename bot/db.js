const mongoose = require('mongoose');

const BOT_ENV = process.env.BOT_ENV || 'test';

if (!['main', 'test'].includes(BOT_ENV)) {
  console.error(`❌ Nieprawidłowa wartość BOT_ENV: "${BOT_ENV}". Dozwolone: "main", "test"`);
  process.exit(1);
}

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️ Brak MONGODB_URI – baza niedostępna');
    return false;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB połączone (środowisko: ${BOT_ENV})`);
    return true;
  } catch (err) {
    console.error('❌ MongoDB błąd:', err.message);
    return false;
  }
}

function getActiveEnv() {
  return BOT_ENV;
}

function col(name) {
  return `${BOT_ENV}_${name}`;
}

// Inicjalizacja globalconfigs - dokumenty które MUSZĄ istnieć po starcie
async function initializeGlobalConfigs(logger) {
  if (!mongoose.connection.readyState) {
    console.log('⚠️ Brak połączenia z MongoDB – pomijam inicjalizację globalconfigs');
    return;
  }

  try {
    const GlobalConfigSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: mongoose.Schema.Types.Mixed,
      updatedAt: Date
    }, { collection: 'globalconfigs' });

    const GlobalConfig = mongoose.models.globalconfigs 
      || mongoose.model('globalconfigs', GlobalConfigSchema);

    // Dokumenty które MUSZĄ istnieć po starcie bota
    const requiredDocs = [
      { key: 'active_env', value: BOT_ENV },
      { key: 'bot_status', value: 'online' },
      { key: 'custom_status', value: '' }
    ];

    for (const doc of requiredDocs) {
      await GlobalConfig.findOneAndUpdate(
        { key: doc.key },
        { key: doc.key, value: doc.value, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    if (logger) {
      logger.system('info', 'GlobalConfigs zainicjalizowane (active_env, bot_status, custom_status)', 'db');
    } else {
      console.log('✅ GlobalConfigs zainicjalizowane');
    }
  } catch (err) {
    if (logger) {
      logger.system('error', `Błąd inicjalizacji GlobalConfigs: ${err.message}`, 'db');
    } else {
      console.error(' Błąd inicjalizacji GlobalConfigs:', err.message);
    }
  }
}

module.exports = { connectDB, getActiveEnv, col, initializeGlobalConfigs };