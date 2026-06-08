"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';
import { FiSettings, FiSave } from 'react-icons/fi';

export default function ConfigPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const { accentColor } = useTheme();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mongoStatus, setMongoStatus] = useState(null);

  useEffect(() => {
    fetch("/api/proxy/api/status").then(res => res.json()).then(data => setMongoStatus(data.mongo)).catch(() => setMongoStatus(false));
    if (guildId) {
      fetch(`/api/proxy/api/guilds/${guildId}/config`).then(res => res.json()).then(data => { setConfig(data); setLoading(false); }).catch(() => { setConfig({ error: true }); setLoading(false); });
    } else setLoading(false);
  }, [guildId]);

  const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mongoStatus) return setMessage("❌ Brak połączenia z bazą danych");
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/api/guilds/${guildId}/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      if (!res.ok) throw new Error();
      setMessage("✅ Zapisano pomyślnie");
    } catch { setMessage("❌ Błąd zapisu"); } finally { setSaving(false); }
  };

  if (!guildId) return <div className="empty-state">Wybierz serwer z lewego menu.</div>;
  if (loading) return <div className="empty-state">Ładowanie konfiguracji...</div>;
  if (config?.error) return <div className="empty-state" style={{ color: '#ef4444' }}>Błąd ładowania konfiguracji</div>;

  const disabled = !mongoStatus;

  return (
    <div className="config-page">
      <div className="page-header">
        <h1 style={{ color: accentColor }}><FiSettings /> Konfiguracja bota</h1>
        <p>Zarządzaj ustawieniami swojego serwera</p>
      </div>

      {disabled && <div className="warning-box">⚠️ Brak połączenia z bazą danych – zmiany nie zostaną zapisane.</div>}

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
            <span className="config-description">Ile komend na minutę może użyć jeden użytkownik (rate limiting)</span>
          </div>

          <div className="config-item toggle">
            <div className="toggle-header">
              <span>Auto-delete komend</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={config.autoDeleteCommands || false} onChange={(e) => handleChange("autoDeleteCommands", e.target.checked)} disabled={disabled} />
                <span className="slider"></span>
              </label>
            </div>
            <span className="config-description">Bot automatycznie usuwa komendy po ich wykonaniu</span>
          </div>

          <div className="config-item">
            <label>Czas odpowiedzi (ms)</label>
            <input type="number" value={config.responseDelay ?? 500} onChange={(e) => handleChange("responseDelay", parseInt(e.target.value) || 0)} min={0} max={5000} step={100} disabled={disabled} className="config-input" />
            <span className="config-description">Opóźnienie przed odpowiedzią bota w milisekundach (symulacja pisania). 0 = brak opóźnienia</span>
          </div>
        </div>

        {!disabled && (
          <button type="submit" className="btn-base btn-success" disabled={saving}>
            {saving ? "Zapisywanie..." : <><FiSave /> Zapisz ustawienia</>}
          </button>
        )}

        {message && <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>{message}</div>}
      </form>

      <style jsx>{`
        .empty-state { text-align: center; padding: 3rem; color: #6b6b76; }
        .config-page {
          margin: 100px 200px 2rem 200px;
          padding: 1.5rem;
          border: 1px solid ${accentColor};
          border-radius: var(--border-radius);
          background: #0a0a0f;
        }
        .page-header h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 1.5rem; margin-bottom: 0.5rem; }
        .page-header p { color: #6b6b76; margin-bottom: 1.5rem; }
        .warning-box { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: var(--border-radius); padding: 1rem; margin-bottom: 1.5rem; color: #ef4444; }
        .config-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .section {
          background: #14141c;
          border: 1px solid #1e1e26;
          border-radius: var(--border-radius);
          padding: 1.5rem;
        }
        .section h2 { font-size: 1.1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .config-item { margin-bottom: 1.5rem; }
        .config-item:last-child { margin-bottom: 0; }
        .config-item label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #fff; }
        .config-input, .config-select { width: 100%; padding: 0.75rem; border: 1px solid #1e1e26; border-radius: var(--border-radius); background: #1e1e26; color: #fff; font-size: 0.9rem; }
        .config-input:focus, .config-select:focus { outline: none; border-color: ${accentColor}; }
        .config-description { display: block; font-size: 0.8rem; color: #6b6b76; margin-top: 0.25rem; }
        .toggle { padding: 1rem; background: #1e1e26; border-radius: var(--border-radius); }
        .toggle-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .toggle-header span { font-weight: 600; color: #fff; }
        .toggle-input { width: 40px; height: 20px; }
.save-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .message { padding: 1rem; border-radius: var(--border-radius); text-align: center; font-weight: 600; }
        .message.success { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; }
        .message.error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; }
      `}</style>
    </div>
  );
}