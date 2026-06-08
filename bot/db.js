const mongoose = require('mongoose');

// ─── Środowisko ───────────────────────────────────────────────────────────────

const BOT_ENV = process.env.BOT_ENV || 'test';

if (!['main', 'test'].includes(BOT_ENV)) {
  console.error(`❌ Nieprawidłowa wartość BOT_ENV: "${BOT_ENV}". Dozwolone: "main", "test"`);
  process.exit(1);
}

// Wybór URI na podstawie środowiska
const MONGODB_URI = BOT_ENV === 'main'
  ? process.env.MONGODB_URI_MAIN
  : process.env.MONGODB_URI_TEST;

// ─── Połączenie ───────────────────────────────────────────────────────────────

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn(`⚠️  Brak MONGODB_URI_${BOT_ENV.toUpperCase()} w .env — baza nie zostanie uruchomiona`);
    return false;
  }
  try {
    console.log(`📡 Łączenie z MongoDB [${BOT_ENV}]...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB [${BOT_ENV}] połączone`);
    return true;
  } catch (err) {
    console.error(`❌ Błąd połączenia z MongoDB [${BOT_ENV}]: ${err.message}`);
    if (err.message.includes('auth failed'))
      console.error('   → Sprawdź login/hasło w URI');
    if (err.message.includes('ENOTFOUND') || err.message.includes('timeout'))
      console.error('   → Sprawdź whitelist IP w MongoDB Atlas');
    return false;
  }
}

// ─── Inicjalizacja struktury bazy ─────────────────────────────────────────────
// Tworzy kolekcje i indeksy jeśli nie istnieją.
// Nie wstawia żadnych danych — to zadanie modułów.
// Bezpieczne: wywołanie wielokrotne nic nie nadpisuje.

async function initDbStructure() {
  try {
    // Każdy moduł definiuje własny schemat i rejestruje model przez mongoose.
    // Tu tylko upewniamy się że kolekcje i indeksy istnieją.

    // ── global_config ─────────────────────────────────────────────────────
    // Jeden dokument per klucz — status bota, ustawienia właściciela.
    // Wypełniany przez moduł status.js przy starcie.
    const GlobalConfigSchema = new mongoose.Schema({
      key:       { type: String, required: true, unique: true },
      value:     { type: mongoose.Schema.Types.Mixed },
      updatedAt: { type: Date, default: Date.now },
    });
    if (!mongoose.models.global_config)
      mongoose.model('global_config', GlobalConfigSchema, 'global_config');

    // ── guild_config ──────────────────────────────────────────────────────
    // Jeden dokument per serwer — prefix, język, strefy czasowe itd.
    // Wypełniany przez moduł config.js.
    const GuildConfigSchema = new mongoose.Schema({
      guildId:            { type: String, required: true, unique: true },
      prefix:             { type: String, default: '!' },
      language:           { type: String, default: 'pl' },
      timezone:           { type: String, default: 'Europe/Warsaw' },
      commandLimit:       { type: Number, default: 10 },
      autoDeleteCommands: { type: Boolean, default: false },
      responseDelay:      { type: Number, default: 0 },
    }, { timestamps: true });
    if (!mongoose.models.guild_config)
      mongoose.model('guild_config', GuildConfigSchema, 'guild_config');

    // ── moderation_settings ───────────────────────────────────────────────
    // Jeden dokument per serwer — ustawienia moderacji.
    // Wypełniany przez moduł moderation.js.
    const ModerationSettingsSchema = new mongoose.Schema({
      guildId:          { type: String, required: true, unique: true },
      banType:          { type: String, default: 'discord', enum: ['discord', 'role'] },
      banRoleId:        String,
      appealChannelId:  String,
      modLogChannel:    String,
      autoModEnabled:   { type: Boolean, default: false },
      blockLinks:       { type: Boolean, default: false },
      blockInvites:     { type: Boolean, default: false },
      warnThreshold:    { type: Number, default: 3 },
      muteRoleId:       String,
      commandPermissions: { type: mongoose.Schema.Types.Mixed, default: {} },
      commandEnabled:     { type: mongoose.Schema.Types.Mixed, default: {} },
    }, { timestamps: true });
    if (!mongoose.models.moderation_settings)
      mongoose.model('moderation_settings', ModerationSettingsSchema, 'moderation_settings');

    // ── punishments ───────────────────────────────────────────────────────
    // Wiele dokumentów — historia wszystkich kar ze wszystkich serwerów.
    // Wypełniany przez moduł moderation.js.
    const PunishmentSchema = new mongoose.Schema({
      guildId:     { type: String, required: true },
      userId:      { type: String, required: true },
      moderatorId: { type: String, required: true },
      type:        { type: String, required: true, enum: ['warn', 'mute', 'ban', 'kick', 'unmute', 'unban'] },
      banType:     { type: String, enum: ['discord', 'role'] },
      reason:      { type: String, default: 'Brak powodu' },
      duration:    Number,
      expiresAt:   Date,
      active:      { type: Boolean, default: true },
    }, { timestamps: true });
    const Punishment = mongoose.models.punishments
      || mongoose.model('punishments', PunishmentSchema, 'punishments');
    await Punishment.collection.createIndex({ guildId: 1, userId: 1 });
    await Punishment.collection.createIndex({ guildId: 1, active: 1 });

    // ── welcome_settings ──────────────────────────────────────────────────
    // Jeden dokument per serwer — ustawienia powitań.
    // Wypełniany przez moduł welcome.js (przyszły).
    const WelcomeSchema = new mongoose.Schema({
      guildId:   { type: String, required: true, unique: true },
      enabled:   { type: Boolean, default: false },
      channelId: String,
      message:   { type: String, default: 'Witaj {user} na serwerze {server}!' },
    }, { timestamps: true });
    if (!mongoose.models.welcome_settings)
      mongoose.model('welcome_settings', WelcomeSchema, 'welcome_settings');

    // ── role_groups ───────────────────────────────────────────────────────
    // Hierarchia ról parent/child.
    // Wypełniany przez moduł roles.js.
    const RoleGroupSchema = new mongoose.Schema({
      guildId:        { type: String, required: true },
      parentRoleId:   { type: String, required: true },
      parentRoleName: String,
      mode:           { type: String, default: 'multiple', enum: ['single', 'multiple'] },
      childRoles:     [{ roleId: String, roleName: String }],
    }, { timestamps: true });
    const RoleGroup = mongoose.models.role_groups
      || mongoose.model('role_groups', RoleGroupSchema, 'role_groups');
    await RoleGroup.collection.createIndex({ guildId: 1 });

    // ── tickets ───────────────────────────────────────────────────────────
    // System ticketów (przyszły moduł).
    const TicketSchema = new mongoose.Schema({
      guildId:   { type: String, required: true },
      userId:    { type: String, required: true },
      channelId: String,
      status:    { type: String, default: 'open', enum: ['open', 'closed', 'resolved'] },
      reason:    String,
    }, { timestamps: true });
    const Ticket = mongoose.models.tickets
      || mongoose.model('tickets', TicketSchema, 'tickets');
    await Ticket.collection.createIndex({ guildId: 1, status: 1 });

    console.log(`✅ Struktura bazy gotowa [${BOT_ENV}]: global_config, guild_config, moderation_settings, punishments, welcome_settings, role_groups, tickets`);

  } catch (err) {
    console.error(`❌ Błąd inicjalizacji struktury bazy: ${err.message}`);
    throw err;
  }
}

// ─── Eksport ──────────────────────────────────────────────────────────────────

module.exports = {
  connectDB,
  initDbStructure,
  mongoose,      // moduły importują mongoose stąd żeby nie rejestrować modeli podwójnie
  BOT_ENV,
};
