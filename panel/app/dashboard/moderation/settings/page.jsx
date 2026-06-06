"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiSave, FiShield, FiLock, FiBell, FiHash, FiAlertTriangle, FiList, FiEye, FiEyeOff, FiUserCheck, FiLink, FiUserX, FiSettings } from 'react-icons/fi';

export default function ModerationSettings() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [expanded, setExpanded] = useState({ 
    automod: true, 
    ban: true,
    general: false, 
    permissions: false, 
    commands: false 
  });

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      fetch(`/api/proxy/api/guilds/${guildId}/config`).then(r => r.json()),
      fetch(`/api/proxy/api/guilds/${guildId}/roles`).then(r => r.json()),
      fetch(`/api/proxy/api/guilds/${guildId}/channels`).then(r => r.json())
    ]).then(([configData, rolesData, channelsData]) => {
      setConfig({
        // Auto-moderacja
        autoModEnabled: configData.autoModEnabled ?? false,
        blockLinks: configData.blockLinks ?? false,
        blockInvites: configData.blockInvites ?? false,
        warnThreshold: configData.warnThreshold || 3,
        // Ban
        banMethod: configData.banMethod || 'discord',
        banRoleId: configData.banRoleId || null,
        // Ogólne
        publicInfoEnabled: configData.publicInfoEnabled ?? false,
        publicInfoChannel: configData.publicInfoChannel || null,
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
        // Włączniki komand
        commandEnabled: configData.commandEnabled || {
          ban: true,
          mute: true,
          warn: true,
          kick: true,
          clear: true,
        },
        // Pozostałe
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
      const res = await fetch(`/api/proxy/api/guilds/${guildId}/config/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Auto-moderacja
          autoModEnabled: config.autoModEnabled,
          blockLinks: config.blockLinks,
          blockInvites: config.blockInvites,
          warnThreshold: config.warnThreshold,
          // Ban
          banMethod: config.banMethod,
          banRoleId: config.banRoleId,
          // Ogólne
          publicInfoEnabled: config.publicInfoEnabled,
          publicInfoChannel: config.publicInfoChannel,
          protectedRoles: config.protectedRoles,
          commandPermissions: config.commandPermissions,
          commandEnabled: config.commandEnabled,
          // Pozostałe
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

  if (!guildId) return <div className="text-center" style={{ marginTop: "3rem", color: "#6b6b76" }}>Wybierz serwer z lewego menu.</div>;
  if (loading) return <div className="text-center" style={{ marginTop: "3rem", color: "#6b6b76" }}>Ładowanie ustawień...</div>;

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
      <div className="page-header">
        <h1><FiShield /> Ustawienia moderacji</h1>
        <p>Konfiguracja systemu kar, uprawnień i auto-moderacji</p>
      </div>

      {/* SEKCJA 1: AUTO-MODERACJA */}
      <div className="config-section">
        <button className="section-header" onClick={() => toggleSection('automod')}>
          <h2><FiAlertTriangle /> Auto-moderacja</h2>
          <span>{expanded.automod ? '▲' : '▼'}</span>
        </button>
        
        {expanded.automod && (
          <div className="section-content">
            <div className="config-item toggle">
              <div className="toggle-header">
                <span>Auto-moderacja</span>
                <input
                  type="checkbox"
                  checked={config.autoModEnabled}
                  onChange={(e) => handleChange('autoModEnabled', e.target.checked)}
                  className="toggle-input"
                />
              </div>
              <span className="config-description">Włącz/wyłącz automatyczne ostrzeżenia</span>
            </div>

            <div className="config-item toggle">
              <div className="toggle-header">
                <span>Blokuj linki</span>
                <input
                  type="checkbox"
                  checked={config.blockLinks}
                  onChange={(e) => handleChange('blockLinks', e.target.checked)}
                  className="toggle-input"
                />
              </div>
              <span className="config-description">Usuwanie wiadomości z linkami</span>
            </div>

            <div className="config-item toggle">
              <div className="toggle-header">
                <span>Blokuj zaproszenia</span>
                <input
                  type="checkbox"
                  checked={config.blockInvites}
                  onChange={(e) => handleChange('blockInvites', e.target.checked)}
                  className="toggle-input"
                />
              </div>
              <span className="config-description">Zakaz wysyłania invite linków</span>
            </div>

            <div className="config-item">
              <label>
                Próg ostrzeżeń
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.warnThreshold}
                  onChange={(e) => handleChange('warnThreshold', parseInt(e.target.value))}
                  className="range-input"
                />
                <span className="range-value">{config.warnThreshold}</span>
              </label>
              <span className="config-description">Liczba ostrzeżeń przed mute</span>
            </div>
          </div>
        )}
      </div>

      {/* SEKCJA 2: USTAWIENIA BANA */}
      <div className="config-section">
        <button className="section-header" onClick={() => toggleSection('ban')}>
          <h2><FiUserX /> System banowania</h2>
          <span>{expanded.ban ? '▲' : '▼'}</span>
        </button>
        
        {expanded.ban && (
          <div className="section-content">
            <div className="config-item">
              <label className="radio-label">
                <input
                  type="radio"
                  name="banMethod"
                  value="discord"
                  checked={config.banMethod === 'discord'}
                  onChange={(e) => handleChange('banMethod', e.target.value)}
                />
                <span>Systemowy ban Discord</span>
              </label>
              <span className="config-description">Użytkownik zostanie zbanowany przez Discord</span>
            </div>

            <div className="config-item">
              <label className="radio-label">
                <input
                  type="radio"
                  name="banMethod"
                  value="role"
                  checked={config.banMethod === 'role'}
                  onChange={(e) => handleChange('banMethod', e.target.value)}
                />
                <span>Ban przez rolę</span>
              </label>
              <span className="config-description">Nałożenie roli która blokuje dostęp</span>
            </div>

            {config.banMethod === 'role' && (
              <div className="config-item">
                <label>
                  Rola banująca
                  <select
                    value={config.banRoleId || ''}
                    onChange={(e) => handleChange('banRoleId', e.target.value)}
                    className="config-select"
                  >
                    <option value="">-- Wybierz rolę --</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </label>
                <span className="config-description">Rola zostanie nałożona na zbanowanego użytkownika</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEKCJA 3: OGÓLNE */}
      <div className="config-section">
        <button className="section-header" onClick={() => toggleSection('general')}>
          <h2><FiSettings /> Ogólne ustawienia</h2>
          <span>{expanded.general ? '▲' : '▼'}</span>
        </button>
        
        {expanded.general && (
          <div className="section-content">
            <div className="config-item toggle">
              <div className="toggle-header">
                <span>Kanał informacji o karach (publiczny)</span>
                <input
                  type="checkbox"
                  checked={config.publicInfoEnabled}
                  onChange={(e) => handleChange('publicInfoEnabled', e.target.checked)}
                  className="toggle-input"
                />
              </div>
              <span className="config-description">Włącz wysyłanie ogólnych informacji o karach</span>
            </div>

            {config.publicInfoEnabled && (
              <div className="config-item">
                <label>
                  Kanał informacji
                  <select
                    value={config.publicInfoChannel || ''}
                    onChange={(e) => handleChange('publicInfoChannel', e.target.value)}
                    className="config-select"
                  >
                    <option value="">-- Wybierz kanał --</option>
                    {textChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                </label>
                <span className="config-description">Bot będzie wysyłał krótkie, ogólne informacje o karach</span>
              </div>
            )}

            <div className="config-item">
              <label>Ochrona członków (chronione rangi)</label>
              <div className="roles-grid">
                {roles.map(role => (
                  <label key={role.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(config.protectedRoles || []).includes(role.id)}
                      onChange={(e) => handleProtectedRolesChange(role.id, e.target.checked)}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
              <span className="config-description">Osoby z wybranymi rolami nie mogą być karane</span>
            </div>
          </div>
        )}
      </div>

      {/* SEKCJA 4: UPRAWNIENIA DO KOMEND */}
      <div className="config-section">
        <button className="section-header" onClick={() => toggleSection('permissions')}>
          <h2><FiLock /> Konfiguracja uprawnień do poleceń</h2>
          <span>{expanded.permissions ? '▲' : '▼'}</span>
        </button>
        
        {expanded.permissions && (
          <div className="section-content">
            {commandsList.map(cmd => (
              <div key={cmd.id} className="command-permissions">
                <h3>{cmd.label}</h3>
                <div className="roles-grid">
                  {roles.map(role => (
                    <label key={role.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(config.commandPermissions[cmd.id] || []).includes(role.id)}
                        onChange={(e) => handlePermissionChange(cmd.id, role.id, e.target.checked)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
                <span className="config-description">Zaznaczone role będą mogły używać tej komendy</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEKCJA 5: WŁĄCZNIKI KOMEND */}
      <div className="config-section">
        <button className="section-header" onClick={() => toggleSection('commands')}>
          <h2><FiList /> Ustawienia komend</h2>
          <span>{expanded.commands ? '▲' : '▼'}</span>
        </button>
        
        {expanded.commands && (
          <div className="section-content">
            <div className="config-item">
              <label>Włącz / wyłącz komendy</label>
              <div className="commands-toggle">
                {['ban', 'mute', 'warn', 'kick', 'clear'].map(cmd => (
                  <label key={cmd} className="toggle-label">
                    <span>/{cmd}</span>
                    <input
                      type="checkbox"
                      checked={config.commandEnabled[cmd]}
                      onChange={(e) => handleCommandToggle(cmd, e.target.checked)}
                      className="toggle-input"
                    />
                  </label>
                ))}
              </div>
              <span className="config-description">Wyłączone komendy nie będą dostępne dla nikogo</span>
            </div>
          </div>
        )}
      </div>

      <button className="save-button" onClick={handleSave} disabled={saving}>
        {saving ? "Zapisywanie..." : "Zapisz wszystkie ustawienia"}
      </button>
      
      {message && <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>{message}</div>}

      <style jsx>{`
        .moderation-settings {
          max-width: 900px;
          margin: 0 auto;
          padding: 1rem;
        }
        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #fff;
        }
        .page-header p {
          color: #6b6b76;
          margin-bottom: 2rem;
        }
        .config-section {
          background: #14141c;
          border: 1px solid #25252d;
          border-radius: 1rem;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        .section-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 1.5rem;
          background: #1a1a24;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .section-header:hover {
          background: #202028;
        }
        .section-header h2 {
          font-size: 1.1rem;
          margin: 0;
          color: #a5b4fc;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .section-header span {
          color: #6b6b76;
          font-size: 1rem;
        }
        .section-content {
          padding: 1.5rem;
          border-top: 1px solid #25252d;
        }
        .config-item {
          margin-bottom: 1.5rem;
        }
        .config-item label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #fff;
        }
        .config-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #25252d;
          border-radius: 0.5rem;
          background: #1e1e26;
          color: #fff;
          font-size: 0.9rem;
        }
        .config-description {
          display: block;
          font-size: 0.8rem;
          color: #6b6b76;
          margin-top: 0.25rem;
        }
        .toggle {
          padding: 1rem;
          background: #1e1e26;
          border-radius: 0.5rem;
        }
        .toggle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .toggle-header span {
          font-weight: 600;
          color: #fff;
        }
        .toggle-input {
          width: 40px;
          height: 20px;
          accent-color: #5865f2;
        }
        .range-input {
          width: 100%;
          margin: 0.5rem 0;
        }
        .range-value {
          display: inline-block;
          background: #5865f2;
          color: #fff;
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }
        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .radio-label input[type="radio"] {
          width: 18px;
          height: 18px;
          accent-color: #5865f2;
        }
        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #1e1e26;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .checkbox-label:hover {
          background: #25252d;
        }
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #5865f2;
        }
        .command-permissions {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #1e1e26;
          border-radius: 0.5rem;
        }
        .command-permissions h3 {
          font-size: 0.95rem;
          margin-bottom: 0.75rem;
          color: #fff;
        }
        .commands-toggle {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #1e1e26;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .save-button {
          width: 100%;
          padding: 1rem 2rem;
          background: #5865f2;
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }
        .save-button:hover:not(:disabled) {
          background: #4752c4;
          transform: translateY(-2px);
        }
        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .message {
          padding: 1rem;
          border-radius: 0.5rem;
          text-align: center;
          font-weight: 600;
        }
        .message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          color: #10b981;
        }
        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}