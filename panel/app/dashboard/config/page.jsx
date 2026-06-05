"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiSettings, FiShield, FiBell } from 'react-icons/fi';

export default function ConfigPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mongoStatus, setMongoStatus] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/status")
      .then(res => res.json())
      .then(data => setMongoStatus(data.mongo))
      .catch(() => setMongoStatus(false));

    if (guildId) {
      fetch(`http://localhost:3001/api/guilds/${guildId}/config`)
        .then(res => res.json())
        .then(data => { setConfig(data); setLoading(false); })
        .catch(() => { setConfig({ error: true }); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [guildId]);

  const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mongoStatus) return setMessage("❌ Brak połączenia z bazą danych");
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      setMessage("✅ Zapisano pomyślnie");
    } catch {
      setMessage("❌ Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  if (!guildId) return <div className="config-container" style={{ textAlign: "center", marginTop: "3rem", color: "#6b6b76" }}>Wybierz serwer z lewego menu.</div>;
  if (loading) return <div className="config-container" style={{ textAlign: "center", marginTop: "3rem", color: "#6b6b76" }}>Ładowanie konfiguracji...</div>;
  if (config?.error) return <div className="config-container" style={{ textAlign: "center", marginTop: "3rem", color: "#f87171" }}>Błąd ładowania konfiguracji</div>;

  const disabled = !mongoStatus;

  return (
    <div className="config-container">
      <div className="config-header">
        <h1>Konfiguracja bota</h1>
        <p className="config-sub">Zarządzaj ustawieniami swojego serwera</p>
      </div>

      {disabled && (
        <div className="alert">
          ⚠️ Brak połączenia z bazą danych – zmiany nie zostaną zapisane.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="settings-card">
          <div className="card-title"><FiSettings /> Ustawienia ogólne</div>
          <div className="form-group">
            <label className="form-label">Prefiks</label>
            <input type="text" className="form-input" value={config.prefix || ""} onChange={e => handleChange("prefix", e.target.value)} maxLength={3} disabled={disabled} />
            <span className="form-hint">Znak poprzedzający komendy bota (maks. 3 znaki)</span>
          </div>
          <div className="form-group">
            <label className="form-label">Język</label>
            <select className="form-select" value={config.language || "pl"} onChange={e => handleChange("language", e.target.value)} disabled={disabled}>
              <option value="pl">Polski</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Strefa czasowa</label>
            <select className="form-select" value={config.timezone || "Europe/Warsaw"} onChange={e => handleChange("timezone", e.target.value)} disabled={disabled}>
              <option value="Europe/Warsaw">Warszawa (UTC+1/+2)</option>
              <option value="Europe/London">Londyn (UTC+0/+1)</option>
              <option value="America/New_York">Nowy Jork (UTC-5/-4)</option>
            </select>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-title"><FiShield /> Moderacja i bezpieczeństwo</div>
          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Auto-moderacja</div>
                <div className="setting-desc">Włącz/wyłącz automatyczne ostrzeżenia</div>
              </div>
              <label className="toggle-switch-modern">
                <input type="checkbox" checked={config.autoModEnabled || false} onChange={e => handleChange("autoModEnabled", e.target.checked)} disabled={disabled} />
                <span className="toggle-slider-modern"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Blokuj linki</div>
                <div className="setting-desc">Usuwanie wiadomości z linkami</div>
              </div>
              <label className="toggle-switch-modern">
                <input type="checkbox" checked={config.blockLinks || false} onChange={e => handleChange("blockLinks", e.target.checked)} disabled={disabled} />
                <span className="toggle-slider-modern"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Blokuj zaproszenia</div>
                <div className="setting-desc">Zakaz wysyłania invite linków</div>
              </div>
              <label className="toggle-switch-modern">
                <input type="checkbox" checked={config.blockInvites || false} onChange={e => handleChange("blockInvites", e.target.checked)} disabled={disabled} />
                <span className="toggle-slider-modern"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Próg ostrzeżeń</div>
                <div className="setting-desc">Liczba ostrzeżeń przed mute</div>
              </div>
              <div className="range-wrapper">
                <input type="range" className="range-slider" min="1" max="10" value={config.warnThreshold || 3} onChange={e => handleChange("warnThreshold", parseInt(e.target.value))} disabled={disabled} />
                <span className="range-value">{config.warnThreshold || 3}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-title"><FiBell /> Powiadomienia i logi</div>
          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Wiadomości powitalne</div>
                <div className="setting-desc">Wysyłaj powitanie na kanale</div>
              </div>
              <label className="toggle-switch-modern">
                <input type="checkbox" checked={config.welcomeEnabled || false} onChange={e => handleChange("welcomeEnabled", e.target.checked)} disabled={disabled} />
                <span className="toggle-slider-modern"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Logi zdarzeń</div>
                <div className="setting-desc">Zapisuj akcje członków</div>
              </div>
              <label className="toggle-switch-modern">
                <input type="checkbox" checked={config.logEnabled || false} onChange={e => handleChange("logEnabled", e.target.checked)} disabled={disabled} />
                <span className="toggle-slider-modern"></span>
              </label>
            </div>
          </div>
        </div>

        {!disabled && (
          <div style={{ marginTop: "2rem", textAlign: "right" }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Zapisywanie..." : "💾 Zapisz ustawienia"}
            </button>
          </div>
        )}
        {message && <p className="message" style={{ marginTop: "1rem", textAlign: "center" }}>{message}</p>}
      </form>
    </div>
  );
}