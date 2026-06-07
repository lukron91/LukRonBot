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
    // Używamy opcji, które zapobiegają zamrożeniu aplikacji przy problemach z siecią
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB połączone | środowisko: ${BOT_ENV}`);
    return true;
  } catch (err) {
    console.error('❌ KRYTYCZNY BŁĄD POŁĄCZENIA Z MONGODB:');
    console.error(`👉 ${err.message}`);
    return false;
  }
}

// Funkcja do tworzenia nazw kolekcji z przedrostkiem środowiska
function col(name) {
  return `${BOT_ENV}_${name}`;
}

function getActiveEnv() {
  return BOT_ENV;
}

module.exports = { connectDB, col, getActiveEnv };
