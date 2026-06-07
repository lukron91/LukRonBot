const mongoose = require('mongoose');

const BOT_ENV = process.env.BOT_ENV || 'test';

if (!['main', 'test'].includes(BOT_ENV)) {
  console.error(`❌ Nieprawidłowa wartość BOT_ENV: "${BOT_ENV}". Dozwolone: "main", "test"`);
  process.exit(1);
}

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️ Brak MONGODB_URI w pliku .env – baza danych nie zostanie uruchomiona');
    return false;
  }
  try {
    console.log(`📡 Próba połączenia z MongoDB (środowisko: ${BOT_ENV})...`);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Czekaj max 5s na połączenie
    });
    console.log(`✅ MongoDB połączone pomyślnie | baza: lukronbot | środowisko: ${BOT_ENV}`);
    return true;
  } catch (err) {
    console.error('❌ KRYTYCZNY BŁĄD POŁĄCZENIA Z MONGODB:');
    console.error(`👉 Wiadomość: ${err.message}`);
    if (err.message.includes('auth failed')) {
      console.error('👉 Sugestia: Sprawdź login i hasło w MONGODB_URI.');
    } else if (err.message.includes('timeout') || err.message.includes('ENOTFOUND')) {
      console.error('👉 Sugestia: Sprawdź czy IP Twojego serwera jest dodane do Whitelist w MongoDB Atlas.');
    }
    return false;
  }
}

function col(name) {
  return `${BOT_ENV}_${name}`;
}

function getActiveEnv() {
  return BOT_ENV;
}

module.exports = { connectDB, col, getActiveEnv };
