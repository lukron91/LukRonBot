"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/components/Toast';
import { FiSave, FiShield, FiLock, FiBell, FiHash, FiAlertTriangle, FiList, FiEye, FiEyeOff, FiUserCheck, FiLink, FiUserX, FiSettings, FiRefreshCw } from 'react-icons/fi';

export default function ModerationSettings() {
  const { accentColor } = useTheme();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
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
    const safeFetch = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' dla ' + url);
      const text = await res.text();
      try { return JSON.parse(text); }
      catch { throw new Error('Nieprawidłowa odpowiedź JSON z ' + url); }
    };

    Promise.all([
      safeFetch('/api/proxy/api/guilds/' + guildId + '/config'),
      safeFetch('/api/proxy/api/guilds/' + guildId + '/roles'),
      safeFetch('/api/proxy/api/guilds/' + guildId + '/channels'),
    ]).then(([configData, rolesData, channelsData]) => {
      setConfig({
        autoModEnabled: configData.autoModEnabled ?? false,
        blockLinks: configData.blockLinks ?? false,
        blockInvites: configData.blockInvites ?? false,
        warnThreshold: configData.warnThreshold || 3,
        banMethod: configData.banMethod || 'discord',
        banRoleId: configData.banRoleId || null,
        publicInfoEnabled: configData.publicInfoEnabled ?? false,
        publicInfoChannel: configData.publicInfoChannel || null,
        protectedRoles: configData.protectedRoles || [],
        commandPermissions: configData.commandPermissions || { warn: [], mute: [], ban: [], kick: [], clear: [], unban: [], unmute: [] },
        commandEnabled: configData.commandEnabled || { ban: true, mute: true, warn: true, kick: true, clear: true },
        modLogChannel: configData.modLogChannel || null,
        autoWarnThreshold: configData.autoWarnThreshold || 3,
        autoMuteThreshold: configData.autoMuteThreshold || 5,
        autoKickThreshold: configData.autoKickThreshold || 7,
        autoBanThreshold: configData.autoBanThreshold || 10,
        autoActionEnabled: configData.autoActionEnabled ?? false,
        ignoredChannels: configData.ignoredChannels || [],
      });
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setChannels(Array.isArray(channelsData) ? channelsData : []);
      setError(null);
    }).catch(err => {
      console.error('Błąd ładowania ustawień moderacji:', err);
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
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
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/config/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoModEnabled: config.autoModEnabled,
          blockLinks: config.blockLinks,
          blockInvites: config.blockInvites,
          warnThreshold: config.warnThreshold,
          banMethod: config.banMethod,
          banRoleId: config.banRoleId,
          publicInfoEnabled: config.publicInfoEnabled,
          publicInfoChannel: config.publicInfoChannel,
          protectedRoles: config.protectedRoles,
          commandPermissions: config.commandPermissions,
          commandEnabled: config.commandEnabled,
          modLogChannel: config.modLogChannel,
          autoWarnThreshold: config.autoWarnThreshold,
          autoMuteThreshold: config.autoMuteThreshold,
          autoKickThreshold: config.autoKickThreshold,
          autoBanThreshold: config.autoBanThreshold,
          autoActionEnabled: config.autoActionEnabled,
          ignoredChannels: config.ignoredChannels,
        })
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { /* non-JSON response */ }
      if (res.ok) addToast('Ustawienia moderacji zapisane pomyślnie', 'success');
      else addToast('Błąd: ' + (data.error || 'Brak połączenia z serwerem'), 'error');
    } catch (err) {
      addToast('Błąd połączenia: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const textChannels = channels.filter(c => c.type === 0);

  if (!guildId) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Wybierz serwer z lewego menu.
    </div>
  );

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Ładowanie ustawień...
    </div>
  );

  if (error || !config) return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.4)',
        borderRadius: 'var(--border-radius)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', fontWeight: 600, fontSize: '1rem' }}>
          <FiAlertTriangle size={20} />
          Brak połączenia z serwerem
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Nie udało się załadować ustawień moderacji. Upewnij się że bot jest uruchomiony i połączony z bazą danych.
        </p>
        {error && (
          <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            {error}
          </code>
        )}
        <button className="btn-base btn-standard" style={{ alignSelf: 'flex-start' }} onClick={() => { setLoading(true); setError(null); }}>
          <FiRefreshCw /> Spróbuj ponownie
        </button>
      </div>
    </div>
  );

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
<label className="toggle-switch">
                  <input type="checkbox" checked={config.autoModEnabled} onChange={(e) => handleChange('autoModEnabled', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              <span className="config-description">Włącz/wyłącz automatyczne ostrzeżenia</span>
            </div>

            <div className="config-item toggle">
              <div className="toggle-header">
                <span>Blokuj linki</span>
<label className="toggle-switch">
                  <input type="checkbox" checked={config.blockLinks} onChange={(e) => handleChange('blockLinks', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              <span className="config-description">Usuwanie wiadomości z linkami</span>
            </div>

            <div className="config-item toggle">
              <div className="toggle-header">
                <span>Blokuj zaproszenia</span>
<label className="toggle-switch">
                  <input type="checkbox" checked={config.blockInvites} onChange={(e) => handleChange('blockInvites', e.target.checked)} />
                  <span className="slider"></span>
                </label>
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
<label className="toggle-switch">
                  <input type="checkbox" checked={config.publicInfoEnabled} onChange={(e) => handleChange('publicInfoEnabled', e.target.checked)} />
                  <span className="slider"></span>
                </label>
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
                    <label className="toggle-switch" style={{ marginRight: '0.5rem' }}>
                      <input type="checkbox" checked={(config.protectedRoles || []).includes(role.id)} onChange={(e) => handleProtectedRolesChange(role.id, e.target.checked)} />
                      <span className="slider"></span>
                    </label>
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
                      <label className="toggle-switch" style={{ marginRight: '0.5rem' }}>
                        <input type="checkbox" checked={(config.commandPermissions[cmd.id] || []).includes(role.id)} onChange={(e) => handlePermissionChange(cmd.id, role.id, e.target.checked)} />
                        <span className="slider"></span>
                      </label>
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
                    <label className="toggle-switch">
                      <input type="checkbox" checked={config.commandEnabled[cmd]} onChange={(e) => handleCommandToggle(cmd, e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </label>
                ))}
              </div>
              <span className="config-description">Wyłączone komendy nie będą dostępne dla nikogo</span>
            </div>
          </div>
        )}
      </div>

      <button className="btn-base btn-success" onClick={handleSave} disabled={saving}>
        {saving ? "Zapisywanie..." : "Zapisz wszystkie ustawienia"}
      </button>
      
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
          color: var(--text-color);
        }
        .page-header p {
          color: var(--text-muted);
          margin-bottom: 2rem;
        }
        .config-section {
          background: rgba(var(--surface-rgb), var(--surface-opacity));
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          margin-bottom: 1.5rem;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }
        .section-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 1.5rem;
          background: rgba(var(--surface-rgb), 0.5);
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .section-header:hover {
          background: rgba(var(--surface-rgb), 0.8);
        }
        .section-header h2 {
          font-size: 1.1rem;
          margin: 0;
          color: var(--accent-color);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .section-header span {
          color: var(--text-muted);
          font-size: 1rem;
        }
        .section-content {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
        }
        .config-item {
          margin-bottom: 1.5rem;
        }
        .config-item:last-child { margin-bottom: 0; }
        .config-item label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-color);
        }
        .config-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          background: var(--bg-color);
          color: var(--text-color);
          font-size: 0.9rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .config-select:focus { outline: none; border-color: var(--accent-color); }
        .config-description {
          display: block;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
        .toggle {
          padding: 1rem;
          background: rgba(var(--surface-rgb), 0.4);
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
        }
        .toggle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .toggle-header span { font-weight: 600; color: var(--text-color); }
        .range-input { width: 100%; margin: 0.5rem 0; accent-color: var(--accent-color); }
        .range-value {
          display: inline-block;
          background: var(--accent-color);
          color: #fff;
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }
        .radio-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--text-color); }
        .radio-label input[type="radio"] { width: 18px; height: 18px; accent-color: var(--accent-color); }
        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .checkbox-label:hover { background: rgba(var(--surface-rgb), 0.5); border-radius: var(--border-radius); }
        .command-permissions {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(var(--surface-rgb), 0.4);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
        }
        .command-permissions h3 { font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-color); }
        .commands-toggle { display: flex; gap: 1rem; flex-wrap: wrap; }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(var(--surface-rgb), 0.4);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          cursor: pointer;
          color: var(--text-color);
        }
        .message { padding: 1rem; border-radius: var(--border-radius); text-align: center; font-weight: 600; }
        .message.success { background: rgba(16,185,129,0.1); border: 1px solid #10b981; color: #10b981; }
        .message.error { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; color: #ef4444; }
      `}</style>
    </div>
  );
}