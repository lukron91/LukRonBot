"use client";
import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [guildId, setGuildId] = useState(null);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guild = params.get('guild');
    if (!guild) { window.location.href = '/dashboard'; return; }
    setGuildId(guild);
    fetch(`/api/config?guildId=${guild}`).then(r => r.json()).then(setConfig);
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, config })
    });
    if (res.ok) alert('✅ Zapisano!');
    else alert('❌ Błąd');
    setSaving(false);
  };

  if (!config) return <p style={{ color: "#6d7280" }}>Ładowanie...</p>;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>⚙️ Ustawienia ogólne</h1>
        <p style={{ color: "#6d7280", margin: "4px 0 0 0", fontSize: "14px" }}>Konfiguracja podstawowa bota</p>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Podstawowe</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px" }}>Prefix komend</label>
            <input
              value={config.prefix}
              onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
              style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px" }}>Język</label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
              style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="pl">🇵🇱 Polski</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Moduły</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          {Object.entries(config.modules).map(([key, value]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#1e2029", borderRadius: "10px" }}>
              <span style={{ fontWeight: "500" }}>
                {key === 'tickets' && '🎫 Tickety'}
                {key === 'moderation' && '🛡️ Moderacja'}
                {key === 'welcome' && '👋 Powitania'}
                {key === 'logs' && '📝 Logi'}
                {key === 'automod' && ' Auto-moderacja'}
              </span>
              <button
                onClick={() => setConfig({ ...config, modules: { ...config.modules, [key]: !value } })}
                style={{
                  width: "48px", height: "26px", borderRadius: "13px",
                  backgroundColor: value ? "#23a559" : "#4e5058",
                  border: "none", cursor: "pointer", position: "relative",
                  transition: "background-color 0.2s"
                }}
              >
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#fff",
                  position: "absolute", top: "3px", left: value ? "25px" : "3px",
                  transition: "left 0.2s"
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: "14px 32px",
          background: saving ? "#4e5058" : "linear-gradient(135deg, #5865f2, #7c8aff)",
          border: "none", borderRadius: "10px", color: "#fff",
          fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)"
        }}
      >
        {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
      </button>
    </div>
  );
}
