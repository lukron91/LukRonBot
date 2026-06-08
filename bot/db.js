const mongoose = require('mongoose');

// ─── Środowisko ───────────────────────────────────────────────────────────────

const BOT_ENV = process.env.BOT_ENV || 'test';

if (!['main', 'test'].includes(BOT_ENV)) {
  console.error(`❌ Nieprawidłowa wartość BOT_ENV: "${BOT_ENV}". Dozwolone: "main", "test"`);
  process.exit(1);
}

const MONGODB_URI = BOT_ENV === 'main'
  ? process.env.MONGODB_URI_MAIN
  : process.env.MONGODB_URI_TEST;

// ─── Logger (ustawiany przez index.js po inicjalizacji) ───────────────────────

let _logger = null;

function setLogger(logger) {
  _logger = logger;
}

function dbLog(type, message) {
  if (_logger) {
    _logger.db(type, message);
  } else {
    console.log(`[DB] [${type.toUpperCase()}] ${message}`);
  }
}

// ─── Mongoose plugin — automatyczne logowanie operacji ────────────────────────
// Podpięty globalnie — każdy model w każdym module jest automatycznie objęty logowaniem.
// Moduły nie muszą nic robić.

function dbLoggingPlugin(schema, options) {
  const collectionName = options?.collection || 'unknown';

  // Przed zapytaniem — loguj co jest odpytywane
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'countDocuments'], function() {
    const filter = JSON.stringify(this.getFilter ? this.getFilter() : {});
    dbLog('debug', `[${collectionName}] query: ${this.op} ${filter}`);
  });

  // Po zapisie dokumentu
  schema.post('save', function(doc) {
    dbLog('info', `[${collectionName}] save: _id=${doc._id}`);
  });

  // Po updateOne / updateMany
  schema.post(['updateOne', 'updateMany', 'findOneAndUpdate'], function(result) {
    const modified = result?.modifiedCount ?? result?.nModified ?? (result?._id ? 1 : 0);
    dbLog('info', `[${collectionName}] update: zmodyfikowano ${modified} dok.`);
  });

  // Po deleteOne / deleteMany
  schema.post(['deleteOne', 'deleteMany', 'findOneAndDelete'], function(result) {
    const deleted = result?.deletedCount ?? result?.n ?? 0;
    dbLog('info', `[${collectionName}] delete: usunięto ${deleted} dok.`);
  });

  // Po insertMany
  schema.post('insertMany', function(result) {
    dbLog('info', `[${collectionName}] insertMany: wstawiono ${result?.length ?? 0} dok.`);
  });

  // Błędy
  schema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
               'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'save', 'insertMany'],
    function(err, result, next) {
      if (err) {
        dbLog('error', `[${collectionName}] błąd: ${err.message}`);
        if (next) next(err);
      }
    }
  );
}

// ─── Połączenie ───────────────────────────────────────────────────────────────

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn(`⚠️  Brak MONGODB_URI_${BOT_ENV.toUpperCase()} w .env — baza nie zostanie uruchomiona`);
    return false;
  }
  try {
    dbLog('info', `Łączenie z MongoDB [${BOT_ENV}]...`);

    // Eventy połączenia mongoose
    mongoose.connection.on('connected',    () => dbLog('info',  `MongoDB połączone [${BOT_ENV}]`));
    mongoose.connection.on('disconnected', () => dbLog('warn',  `MongoDB rozłączone [${BOT_ENV}]`));
    mongoose.connection.on('reconnected',  () => dbLog('info',  `MongoDB ponownie połączone [${BOT_ENV}]`));
    mongoose.connection.on('error',        err => dbLog('error', `MongoDB błąd połączenia: ${err.message}`));

    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    return true;
  } catch (err) {
    dbLog('error', `Błąd połączenia [${BOT_ENV}]: ${err.message}`);
    if (err.message.includes('auth failed'))
      dbLog('error', '→ Sprawdź login/hasło w URI');
    if (err.message.includes('ENOTFOUND') || err.message.includes('timeout'))
      dbLog('error', '→ Sprawdź whitelist IP w MongoDB Atlas');
    return false;
  }
}

// ─── Inicjalizacja struktury bazy ─────────────────────────────────────────────
// Tworzy kolekcje i indeksy jeśli nie istnieją.
// Nie wstawia żadnych danych — to zadanie modułów.
// Bezpieczne: wywołanie wielokrotne nic nie nadpisuje.

function makeModel(name, schema) {
  // Podepnij plugin logowania z nazwą kolekcji
  schema.plugin(dbLoggingPlugin, { collection: name });
  return mongoose.models[name] || mongoose.model(name, schema, name);
}

async function initDbStructure() {
  try {
    dbLog('info', 'Inicjalizacja struktury bazy...');

    // ── global_config ─────────────────────────────────────────────────────
    makeModel('global_config', new mongoose.Schema({
      key:       { type: String, required: true, unique: true },
      value:     { type: mongoose.Schema.Types.Mixed },
      updatedAt: { type: Date, default: Date.now },
    }));

    // ── guild_config ──────────────────────────────────────────────────────
    makeModel('guild_config', new mongoose.Schema({
      guildId:            { type: String, required: true, unique: true },
      prefix:             { type: String, default: '!' },
      language:           { type: String, default: 'pl' },
      timezone:           { type: String, default: 'Europe/Warsaw' },
      commandLimit:       { type: Number, default: 10 },
      autoDeleteCommands: { type: Boolean, default: false },
      responseDelay:      { type: Number, default: 0 },
    }, { timestamps: true }));

    // ── moderation_settings ───────────────────────────────────────────────
    makeModel('moderation_settings', new mongoose.Schema({
      guildId:            { type: String, required: true, unique: true },
      banType:            { type: String, default: 'discord', enum: ['discord', 'role'] },
      banRoleId:          String,
      appealChannelId:    String,
      modLogChannel:      String,
      autoModEnabled:     { type: Boolean, default: false },
      blockLinks:         { type: Boolean, default: false },
      blockInvites:       { type: Boolean, default: false },
      warnThreshold:      { type: Number, default: 3 },
      muteRoleId:         String,
      commandPermissions: { type: mongoose.Schema.Types.Mixed, default: {} },
      commandEnabled:     { type: mongoose.Schema.Types.Mixed, default: {} },
    }, { timestamps: true }));

    // ── punishments ───────────────────────────────────────────────────────
    const PunishmentModel = makeModel('punishments', new mongoose.Schema({
      guildId:     { type: String, required: true },
      userId:      { type: String, required: true },
      moderatorId: { type: String, required: true },
      type:        { type: String, required: true, enum: ['warn', 'mute', 'ban', 'kick', 'unmute', 'unban'] },
      banType:     { type: String, enum: ['discord', 'role'] },
      reason:      { type: String, default: 'Brak powodu' },
      duration:    Number,
      expiresAt:   Date,
      active:      { type: Boolean, default: true },
    }, { timestamps: true }));
    await PunishmentModel.collection.createIndex({ guildId: 1, userId: 1 });
    await PunishmentModel.collection.createIndex({ guildId: 1, active: 1 });

    // ── welcome_settings ──────────────────────────────────────────────────
    makeModel('welcome_settings', new mongoose.Schema({
      guildId:   { type: String, required: true, unique: true },
      enabled:   { type: Boolean, default: false },
      channelId: String,
      message:   { type: String, default: 'Witaj {user} na serwerze {server}!' },
    }, { timestamps: true }));

    // ── role_groups ───────────────────────────────────────────────────────
    const RoleGroupModel = makeModel('role_groups', new mongoose.Schema({
      guildId:        { type: String, required: true },
      parentRoleId:   { type: String, required: true },
      parentRoleName: String,
      mode:           { type: String, default: 'multiple', enum: ['single', 'multiple'] },
      childRoles:     [{ roleId: String, roleName: String }],
    }, { timestamps: true }));
    await RoleGroupModel.collection.createIndex({ guildId: 1 });

    // ── tickets ───────────────────────────────────────────────────────────
    const TicketModel = makeModel('tickets', new mongoose.Schema({
      guildId:   { type: String, required: true },
      userId:    { type: String, required: true },
      channelId: String,
      status:    { type: String, default: 'open', enum: ['open', 'closed', 'resolved'] },
      reason:    String,
    }, { timestamps: true }));
    await TicketModel.collection.createIndex({ guildId: 1, status: 1 });

    dbLog('info', 'Struktura bazy gotowa: global_config, guild_config, moderation_settings, punishments, welcome_settings, role_groups, tickets');

  } catch (err) {
    dbLog('error', `Błąd inicjalizacji struktury: ${err.message}`);
    throw err;
  }
}

// ─── Eksport ──────────────────────────────────────────────────────────────────

module.exports = {
  connectDB,
  initDbStructure,
  setLogger,        // wywoływane przez index.js zaraz po inicjalizacji loggera
  mongoose,         // moduły importują stąd — jeden obiekt mongoose w całym projekcie
  BOT_ENV,
  makeModel,        // moduły używają do rejestracji własnych modeli z automatycznym logowaniem
};
