"use client";
import { useEffect, useState } from "react";

export default function WelcomePage() {
  const [guildId, setGuildId] = useState(null);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const guild = new URLSearchParams(window.location.search).get('guild');
    if (!guild) { window.location.href = '/dashboard'; return; }
    setGuildId(guild);
    fetch(`/api/config?guildId=${guild}`).then(r => r.json()).then(setConfig);
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guildId, config }) });
    alert('✅ Zapisano!');
    setSaving(false);
  };

  if (!config) return <p style={{ color: "#6d7280" }}>Ładowanie...</p>;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>👋 Powitania</h1>
        <p style={{ color: "#6d7280", margin: "4px 0 0 0", fontSize: "14px" }}>Automatyczne wiadomości powitalne</p>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Kanał powitań</h3>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280" }}>ID kanału</label>
        <input value={config.welcome.channelId || ''} onChange={(e) => setConfig({ ...config, welcome: { ...config.welcome, channelId: e.target.value || null } })} placeholder="Wklej ID kanału" style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Wiadomość powitalna</h3>
        <p style={{ fontSize: "12px", color: "#6d7280", marginBottom: "12px" }}>Dostępne zmienne: <code style={{ backgroundColor: "#1e2029", padding: "2px 6px", borderRadius: "4px" }}>{"{user}"}</code> <code style={{ backgroundColor: "#1e2029", padding: "2px 6px", borderRadius: "4px" }}>{"{guild}"}</code></p>
        <textarea value={config.welcome.message} onChange={(e) => setConfig({ ...config, welcome: { ...config.welcome, message: e.target.value } })} rows="4" style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", resize: "vertical", boxSizing: "border-box" }} />
      </div>

      <button onClick={save} disabled={saving} style={{ padding: "14px 32px", background: saving ? "#4e5058" : "linear-gradient(135deg, #5865f2, #7c8aff)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)" }}>
        {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
      </button>
    </div>
  );
}
