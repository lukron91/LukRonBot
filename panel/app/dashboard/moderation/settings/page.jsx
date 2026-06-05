"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiSave, FiShield, FiLock, FiBell, FiHash, FiAlertTriangle, FiList, FiEye, FiEyeOff, FiUserCheck } from 'react-icons/fi';

export default function ModerationSettings() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [expanded, setExpanded] = useState({ general: true, permissions: false, commands: false });

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      fetch(`http://localhost:3001/api/guilds/${guildId}/config`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/roles`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/channels`).then(r => r.json())
    ]).then(([configData, rolesData, channelsData]) => {
      setConfig({
        ...configData,
        // Ogólne
        publicInfoEnabled: configData.publicInfoEnabled ?? false,
        publicInfoChannel: configData.publicInfoChannel || null,
        disablePrivateMessages: configData.disablePrivateMessages ?? false,
        protectedRoles: configData.protectedRoles || [],
        // Uprawnienia do komend
        commandPermissions: configData.commandPermissions || {
          warn: [],
          mute: [],
          ban: [],
          kick: [],
          clear: [],
          unban: [],
          unmute: [],
        },
        // Włączniki komend
        commandEnabled: configData.commandEnabled || {
          ban: true,
          mute: true,
          warn: true,
          kick: true,
          clear: true,
        },
        // Pozostałe (dla kompatybilności)
        banMethod: configData.banMethod || 'discord',
        banRoleId: configData.banRoleId || null,
        modLogChannel: configData.modLogChannel || null,
        autoWarnThreshold: configData.autoWarnThreshold || 3,
        autoMuteThreshold: configData.autoMuteThreshold || 5,
        autoKickThreshold: configData.autoKickThreshold || 7,
        autoBanThreshold: configData.autoBanThreshold || 10,
        autoActionEnabled: configData.autoActionEnabled ?? false,
        ignoredChannels: configData.ignoredChannels || [],
      });
      setRoles(rolesData);
      setChannels(channelsData);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [guildId]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (command, roleId, isChecked) => {
    const current = config.commandPermissions[command] || [];
    const updated = isChecked 
      ? [...current, roleId]
      : current.filter(id => id !== roleId);
    handleChange('commandPermissions', { ...config.commandPermissions, [command]: updated });
  };

  const handleCommandToggle = (command, enabled) => {
    handleChange('commandEnabled', { ...config.commandEnabled, [command]: enabled });
  };

  const handleProtectedRolesChange = (roleId, isChecked) => {
    const current = config.protectedRoles || [];
    const updated = isChecked 
      ? [...current, roleId]
      : current.filter(id => id !== roleId);
    handleChange('protectedRoles', updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/config/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicInfoEnabled: config.publicInfoEnabled,
          publicInfoChannel: config.publicInfoChannel,
          disablePrivateMessages: config.disablePrivateMessages,
          protectedRoles: config.protectedRoles,
          commandPermissions: config.commandPermissions,
          commandEnabled: config.commandEnabled,
          // Pozostałe (nie zmieniamy, ale wysyłamy dla bezpieczeństwa)
          banMethod: config.banMethod,
          banRoleId: config.banRoleId,
          modLogChannel: config.modLogChannel,
          autoWarnThreshold: config.autoWarnThreshold,
          autoMuteThreshold: config.autoMuteThreshold,
          autoKickThreshold: config.autoKickThreshold,
          autoBanThreshold: config.autoBanThreshold,
          autoActionEnabled: config.autoActionEnabled,
          ignoredChannels: config.ignoredChannels,
        })
      });
      const data = await res.json();
      if (res.ok) setMessage("✅ Ustawienia zapisane");
      else setMessage(`❌ Błąd: ${data.error}`);
    } catch (err) {
      setMessage(`❌ Błąd: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const textChannels = channels.filter(c => c.type === 0);

  if (!guildId) return <div className="moderation-settings" style={{ textAlign: 'center', marginTop: '3rem', color: '#6b6b76' }}>Wybierz serwer z lewego menu.</div>;
  if (loading) return <div className="moderation-settings" style={{ textAlign: 'center', marginTop: '3rem' }}>Ładowanie ustawień...</div>;

  const commandsList = [
    { id: 'warn', label: 'Ostrzeżenia (warn)' },
    { id: 'mute', label: 'Wyciszenie (mute)' },
    { id: 'ban', label: 'Ban' },
    { id: 'kick', label: 'Wyrzucenie (kick)' },
    { id: 'clear', label: 'Czyszczenie wiadomości (clear)' },
    { id: 'unban', label: 'Odbanowanie' },
    { id: 'unmute', label: 'Odciszenie' },
  ];

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="moderation-settings">
      <div className="settings-header">
        <h1>🛡️ Ustawienia moderacji</h1>
        <p className="settings-sub">Konfiguracja systemu kar, uprawnień i powiadomień</p>
      </div>

      {/* SEKCJA 1: OGÓLNE */}
      <div className="settings-section">
        <div className="section-header" onClick={() => toggleSection('general')}>
          <h2>⚙️ Ogólne ustawienia</h2>
          <span className="toggle-icon">{expanded.general ? '▲' : '▼'}</span>
        </div>
        {expanded.general && (
          <div className="section-content">
            <div className="settings-card">
              <div className="card-title"><FiBell /> Kanał informacji o karach (publiczny)</div>
              <div className="form-group">
                <div className="toggle-wrapper">
                  <span>Włącz wysyłanie ogólnych informacji o karach</span>
                  <label className="toggle-switch-modern">
                    <input type="checkbox" checked={config.publicInfoEnabled} onChange={e => handleChange('publicInfoEnabled', e.target.checked)} />
                    <span className="toggle-slider-modern"></span>
                  </label>
                </div>
              </div>
              {config.publicInfoEnabled && (
                <div className="form-group">
                  <label className="form-label">Kanał informacji</label>
                  <select
                    className="form-select"
                    value={config.publicInfoChannel || ''}
                    onChange={e => handleChange('publicInfoChannel', e.target.value)}
                  >
                    <option value="">-- Wybierz kanał --</option>
                    {textChannels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                  </select>
                  <span className="form-hint">Bot będzie wysyłał krótkie, ogólne informacje o karach (np. "Użytkownik X otrzymał ostrzeżenie").</span>
                </div>
              )}
            </div>

            <div className="settings-card">
              <div className="card-title"><FiEyeOff /> Wiadomości prywatne</div>
              <div className="form-group">
                <div className="toggle-wrapper">
                  <span>Wyłącz wiadomości prywatne między członkami serwera (poza przyjaciółmi i moderacją)</span>
                  <label className="toggle-switch-modern">
                    <input type="checkbox" checked={config.disablePrivateMessages} onChange={e => handleChange('disablePrivateMessages', e.target.checked)} />
                    <span className="toggle-slider-modern"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-title"><FiUserCheck /> Ochrona członków (chronione rangi)</div>
              <p className="form-hint">Osoby z wybranymi rolami nie mogą być karane przez nikogo (nawet właściciela).</p>
              <div className="roles-grid">
                {roles.map(role => (
                  <label key={role.id} className="role-checkbox">
                    <input
                      type="checkbox"
                      checked={config.protectedRoles?.includes(role.id) || false}
                      onChange={e => handleProtectedRolesChange(role.id, e.target.checked)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEKCJA 2: KONFIGURACJA UPRAWNIEŃ DO POLECEŃ */}
      <div className="settings-section">
        <div className="section-header" onClick={() => toggleSection('permissions')}>
          <h2>🔑 Konfiguracja uprawnień do poleceń</h2>
          <span className="toggle-icon">{expanded.permissions ? '▲' : '▼'}</span>
        </div>
        {expanded.permissions && (
          <div className="section-content">
            {commandsList.map(cmd => (
              <div key={cmd.id} className="settings-card">
                <div className="card-title">{cmd.label}</div>
                <div className="roles-grid">
                  {roles.map(role => (
                    <label key={role.id} className="role-checkbox">
                      <input
                        type="checkbox"
                        checked={config.commandPermissions?.[cmd.id]?.includes(role.id) || false}
                        onChange={e => handlePermissionChange(cmd.id, role.id, e.target.checked)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
                <span className="form-hint">Zaznaczone role będą mogły używać tej komendy.</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEKCJA 3: USTAWIENIA KOMEND */}
      <div className="settings-section">
        <div className="section-header" onClick={() => toggleSection('commands')}>
          <h2>⌨️ Ustawienia komend</h2>
          <span className="toggle-icon">{expanded.commands ? '▲' : '▼'}</span>
        </div>
        {expanded.commands && (
          <div className="section-content">
            <div className="settings-card">
              <div className="card-title">Włącz / wyłącz komendy</div>
              <div className="commands-grid">
                {['ban', 'mute', 'warn', 'kick', 'clear'].map(cmd => (
                  <div key={cmd} className="command-toggle">
                    <span>/{cmd}</span>
                    <label className="toggle-switch-modern">
                      <input type="checkbox" checked={config.commandEnabled?.[cmd] ?? true} onChange={e => handleCommandToggle(cmd, e.target.checked)} />
                      <span className="toggle-slider-modern"></span>
                    </label>
                  </div>
                ))}
              </div>
              <span className="form-hint">Wyłączone komendy nie będą dostępne dla nikogo (nawet dla ciebie).</span>
            </div>
            {/* Tutaj później można dodać specyficzne ustawienia dla poszczególnych komend (np. czas mute) */}
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          <FiSave /> {saving ? "Zapisywanie..." : "Zapisz wszystkie ustawienia"}
        </button>
        {message && <p className="message">{message}</p>}
      </div>

      <style jsx>{`
        .moderation-settings {
          max-width: 1000px;
          margin: 0 auto;
        }
        .settings-header {
          margin-bottom: 2rem;
        }
        .settings-header h1 {
          font-size: 1.8rem;
          font-weight: 700;
          background: linear-gradient(135deg, #e1e1e6, #a5b4fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .settings-sub {
          color: #6b6b76;
        }
        .settings-section {
          margin-bottom: 1.5rem;
          border: 1px solid #2a2a30;
          border-radius: 1rem;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #14141c;
          cursor: pointer;
          transition: background 0.2s;
        }
        .section-header:hover {
          background: #1a1a22;
        }
        .section-header h2 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
          color: #a5b4fc;
        }
        .toggle-icon {
          color: #6b6b76;
          font-size: 0.8rem;
        }
        .section-content {
          padding: 1.5rem;
          background: #0f0f14;
        }
        .settings-card {
          background: #14141c;
          border-radius: 1rem;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          border: 1px solid #25252d;
        }
        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #e1e1e6;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .form-select {
          width: 100%;
          background: #1a1a22;
          border: 1px solid #2a2a30;
          border-radius: 0.75rem;
          padding: 0.6rem 0.8rem;
          color: #e1e1e6;
        }
        .form-hint {
          display: block;
          margin-top: 0.3rem;
          font-size: 0.7rem;
          color: #6b6b76;
        }
        .toggle-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .roles-grid, .commands-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .role-checkbox, .command-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.5rem;
          background: #1a1a22;
          border-radius: 0.5rem;
        }
        .command-toggle {
          justify-content: space-between;
        }
        .btn-primary {
          background: linear-gradient(135deg, #5865f2, #4752c4);
          border: none;
          border-radius: 0.75rem;
          padding: 0.7rem 1.5rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: 0.2s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(88,101,242,0.4);
        }
        .settings-actions {
          margin-top: 1rem;
          text-align: right;
        }
        .message {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}