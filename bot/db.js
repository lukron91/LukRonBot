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
    console.log(`✅ MongoDB połączone | baza: lukronbot | środowisko: ${BOT_ENV}`);
    return true;
  } catch (err) {
    console.error('❌ MongoDB błąd:', err.message);
    return false;
  }
}

// Zwraca nazwę kolekcji z prefiksem środowiska
// col('serverconfigs') → 'main_serverconfigs' lub 'test_serverconfigs'
function col(name) {
  return `${BOT_ENV}_${name}`;
}

function getActiveEnv() {
  return BOT_ENV;
}

module.exports = { connectDB, col, getActiveEnv };