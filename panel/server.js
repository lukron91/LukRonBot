require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const multer = require('multer');
const AdmZip = require('adm-zip');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PANEL_PORT || 3000;
const PANEL_URL = process.env.PANEL_URL || `http://localhost:${PORT}`;

const upload = multer({ dest: path.join(__dirname, '../updates/tmp/') });

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${PANEL_URL}/auth/callback`,
  scope: ['identify', 'guilds', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

async function checkAccess(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/login');
  const guildId = process.env.GUILD_ID;
  const adminRoleIds = (process.env.ADMIN_ROLE_IDS || '').split(',').filter(Boolean);
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${req.user.id}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });
    if (!response.ok) return res.status(403).send('Brak dostępu — nie jesteś członkiem serwera.');
    const member = await response.json();
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });
    const guild = await guildResponse.json();
    if (guild.owner_id === req.user.id) return next();
    if (!adminRoleIds.length) return res.status(403).send('Brak dostępu.');
    const hasRole = member.roles.some(r => adminRoleIds.includes(r));
    if (hasRole) return next();
    return res.status(403).send('Brak dostępu — nie masz wymaganej roli.');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Błąd weryfikacji dostępu.');
  }
}

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/login' }), (req, res) => res.redirect('/'));
app.get('/auth/logout', (req, res) => req.logout(() => res.redirect('/login')));

app.get('/api/me', checkAccess, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    avatar: req.user.avatar
      ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`
  });
});

app.get('/api/guild', checkAccess, async (req, res) => {
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}?with_counts=true`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/roles', checkAccess, async (req, res) => {
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/roles', checkAccess, (req, res) => {
  const { roleIds } = req.body;
  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/^ADMIN_ROLE_IDS=.*/m, `ADMIN_ROLE_IDS=${Array.isArray(roleIds) ? roleIds.join(',') : ''}`);
  fs.writeFileSync(envPath, envContent);
  process.env.ADMIN_ROLE_IDS = Array.isArray(roleIds) ? roleIds.join(',') : '';
  res.json({ success: true });
});

// Aktualizacja przez GitHub
app.post('/api/update/upload', checkAccess, upload.single('update'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku' });

  const ROOT = path.join(__dirname, '..');
  const tmpExtract = path.join(ROOT, 'updates', `extract_${Date.now()}`);

  try {
    // Wypakuj zip do katalogu tymczasowego
    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(tmpExtract, true);

    // Skopiuj pliki do głównego katalogu (nadpisz)
    await fse.copy(tmpExtract, ROOT, { overwrite: true });
    await fse.remove(tmpExtract);
    await fse.remove(req.file.path);

    // Git — skonfiguruj i wypchnij
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO; // np. lukron91/LukRonBot

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.json({ success: true, message: 'Pliki zaktualizowane lokalnie (brak konfiguracji GitHub).' });
    }

    const repoUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;

    // Sprawdź czy git jest zainicjalizowany
    try { execSync('git status', { cwd: ROOT }); } catch {
      execSync('git init', { cwd: ROOT });
      execSync(`git remote add origin ${repoUrl}`, { cwd: ROOT });
    }

    execSync('git config user.email "bot@panel.local"', { cwd: ROOT });
    execSync('git config user.name "Panel Bot"', { cwd: ROOT });

    // Sprawdź czy remote już istnieje
    try {
      execSync('git remote get-url origin', { cwd: ROOT });
    } catch {
      execSync(`git remote add origin ${repoUrl}`, { cwd: ROOT });
    }

    // Ustaw remote z tokenem
    execSync(`git remote set-url origin ${repoUrl}`, { cwd: ROOT });

    execSync('git add -A', { cwd: ROOT });
    execSync(`git commit -m "Aktualizacja ${new Date().toISOString()}"`, { cwd: ROOT });
    execSync('git push origin main --force', { cwd: ROOT });

    res.json({ success: true, message: 'Aktualizacja wypchnięta na GitHub. Railway automatycznie przebuduje aplikację.' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Lista commitów jako "backups"
app.get('/api/backups', checkAccess, (req, res) => {
  const ROOT = path.join(__dirname, '..');
  try {
    const log = execSync('git log --oneline -10', { cwd: ROOT }).toString().trim();
    const commits = log.split('\n').map(line => {
      const [hash, ...rest] = line.split(' ');
      return { name: hash, date: rest.join(' ') };
    });
    res.json(commits);
  } catch {
    res.json([]);
  }
});

// Przywróć commit
app.post('/api/backups/restore', checkAccess, (req, res) => {
  const { name } = req.body;
  const ROOT = path.join(__dirname, '..');
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;

  try {
    execSync(`git checkout ${name} -- src/ panel/`, { cwd: ROOT });
    execSync('git add -A', { cwd: ROOT });
    execSync(`git commit -m "Rollback do ${name}"`, { cwd: ROOT });

    if (GITHUB_TOKEN && GITHUB_REPO) {
      const repoUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;
      execSync(`git remote set-url origin ${repoUrl}`, { cwd: ROOT });
      execSync('git push origin main --force', { cwd: ROOT });
    }

    res.json({ success: true, message: `Przywrócono commit ${name}. Railway przebuduje aplikację.` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', checkAccess, (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(PORT, () => {
  console.log(`✅ Panel webowy działa na ${PANEL_URL}`);
});
