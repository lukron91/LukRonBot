"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';
import { FiSettings, FiSave, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function ConfigPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const { accentColor } = useTheme();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mongoStatus, setMongoStatus] = useState(null);

  const loadConfig = async () => {
    if (!guildId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch("/api/proxy/api/status"),
        fetch('/api/proxy/api/guilds/' + guildId + '/config'),
      ]);
      // status mongo
      if (statusRes.ok) {
        const s = await statusRes.json().catch(() => ({}));
        setMongoStatus(s.mongo ?? false);
      } else {
        setMongoStatus(false);
      }
      // config
      if (!configRes.ok) throw new Error('HTTP ' + configRes.status);
      const text = await configRes.text();
      try { setConfig(JSON.parse(text)); }
      catch { throw new Error('Nieprawidłowa odpowiedź serwera'); }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, [guildId]);

  const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mongoStatus) return setMessage("❌ Brak połączenia z bazą danych");
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/config', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}
      if (res.ok) setMessage("✅ Zapisano pomyślnie");
      else setMessage("❌ Błąd: " + (data.error || 'Brak połączenia z serwerem'));
    } catch (e) {
      setMessage("❌ Błąd połączenia: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!guildId) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Wybierz serwer z lewego menu.
    </div>
  );

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Ładowanie konfiguracji...
    </div>
  );

  if (error || !config) return (
    <div style={{ padding: '2rem', maxWidth: '560px', margin: '2rem auto' }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--border-radius)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600 }}>
          <FiAlertTriangle /> Brak połączenia z serwerem
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{error}</p>
        <button className="btn-base btn-standard" style={{ alignSelf: 'flex-start' }} onClick={loadConfig}>
          <FiRefreshCw /> Spróbuj ponownie
        </button>
      </div>
    </div>
  );

  const disabled = !mongoStatus;

  return (
    <div className="config-page">
      <div className="page-header">
        <h1 style={{ color: accentColor }}><FiSettings /> Konfiguracja ogólna</h1>
        <p>Zarządzaj ustawieniami swojego serwera</p>
      </div>

      {disabled && (
        <div className="warning-box">
          ⚠️ Brak połączenia z bazą danych — zmiany nie zostaną zapisane.
        </div>
      )}

      <form onSubmit={handleSubmit} className="config-form">
        <div className="section">
          <h2 style={{ color: accentColor }}>Ustawienia ogólne</h2>

          <div className="config-item">
            <label>Prefiks</label>
            <input type="text" value={config.prefix || "!"} onChange={(e) => handleChange("prefix", e.target.value)} maxLength={3} disabled={disabled} className="config-input" />
            <span className="config-description">Znak poprzedzający komendy bota (maks. 3 znaki)</span>
          </div>

          <div className="config-item">
            <label>Język</label>
            <select value={config.language || "pl"} onChange={(e) => handleChange("language", e.target.value)} disabled={disabled} className="config-select">
              <option value="pl">Polski</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
            <span className="config-description">Język interfejsu bota</span>
          </div>

          <div className="config-item">
            <label>Strefa czasowa</label>
            <select value={config.timezone || "Europe/Warsaw"} onChange={(e) => handleChange("timezone", e.target.value)} disabled={disabled} className="config-select">
              <option value="Europe/Warsaw">Warszawa (UTC+1/+2)</option>
              <option value="Europe/London">Londyn (UTC+0/+1)</option>
              <option value="America/New_York">Nowy Jork (UTC-5/-4)</option>
            </select>
            <span className="config-description">Strefa czasowa dla logów i powiadomień</span>
          </div>

          <div className="config-item">
            <label>Limit komend (na minutę)</label>
            <input type="number" value={config.commandLimit ?? 10} onChange={(e) => handleChange("commandLimit", parseInt(e.target.value) || 10)} min={1} max={100} disabled={disabled} className="config-input" />
            <span className="config-description">Ile komend na minutę może użyć jeden użytkownik</span>
          </div>

          <div className="config-item toggle">
            <div className="toggle-header">
              <div>
                <span>Auto-delete komend</span>
                <span className="config-description">Bot automatycznie usuwa komendy po ich wykonaniu</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={config.autoDeleteCommands || false} onChange={(e) => handleChange("autoDeleteCommands", e.target.checked)} disabled={disabled} />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="config-item">
            <label>Czas odpowiedzi (ms)</label>
            <input type="number" value={config.responseDelay ?? 500} onChange={(e) => handleChange("responseDelay", parseInt(e.target.value) || 0)} min={0} max={5000} step={100} disabled={disabled} className="config-input" />
            <span className="config-description">Opóźnienie przed odpowiedzią bota. 0 = brak opóźnienia</span>
          </div>
        </div>

        {!disabled && (
          <button type="submit" className="btn-base btn-success" disabled={saving}>
            {saving ? "Zapisywanie..." : <><FiSave /> Zapisz ustawienia</>}
          </button>
        )}

        {message && (
          <div className={'message ' + (message.startsWith('✅') ? 'success' : 'error')}>
            {message}
          </div>
        )}
      </form>

      <style jsx>{`
        .config-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 1.5rem;
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
          margin-bottom: 1.5rem;
        }
        .warning-box {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.4);
          border-radius: var(--border-radius);
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #ef4444;
          font-size: 0.9rem;
        }
        .config-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .section {
          background: rgba(var(--surface-rgb), var(--tab-opacity));
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 1.5rem;
          backdrop-filter: blur(12px);
        }
        .section h2 {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .config-item {
          margin-bottom: 1.5rem;
        }
        .config-item:last-child {
          margin-bottom: 0;
        }
        .config-item label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-color);
        }
        .config-input, .config-select {
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
        .config-input:focus, .config-select:focus {
          outline: none;
          border-color: var(--accent-color);
        }
        .config-input:disabled, .config-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .config-description {
          display: block;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
        .toggle {
          background: rgba(var(--surface-rgb), 0.5);
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
        }
        .toggle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .toggle-header span {
          font-weight: 600;
          color: var(--text-color);
        }
        .message {
          padding: 1rem;
          border-radius: var(--border-radius);
          text-align: center;
          font-weight: 600;
        }
        .message.success {
          background: rgba(16,185,129,0.1);
          border: 1px solid #10b981;
          color: #10b981;
        }
        .message.error {
          background: rgba(239,68,68,0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
