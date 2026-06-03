"use client";
import { useEffect, useState } from "react";

export default function LogsPage() {
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

  const toggle = (k) => setConfig({ ...config, logs: { ...config.logs, [k]: !config.logs[k] } });

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>📝 Logi</h1>
        <p style={{ color: "#6d7280", margin: "4px 0 0 0", fontSize: "14px" }}>Rejestrowanie zdarzeń na serwerze</p>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Kanał logów</h3>
        <input value={config.logs.channelId || ''} onChange={(e) => setConfig({ ...config, logs: { ...config.logs, channelId: e.target.value || null } })} placeholder="ID kanału logów" style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Co logować?</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          {[
            { key: 'logDeletes', label: '🗑️ Usunięte wiadomości' },
            { key: 'logEdits', label: '✏️ Edytowane wiadomości' },
            { key: 'logJoins', label: '🚪 Dołączenia/wyjścia' }
          ].map(({ key, label }) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#1e2029", borderRadius: "10px" }}>
              <span>{label}</span>
              <button onClick={() => toggle(key)} style={{ width: "48px", height: "26px", borderRadius: "13px", backgroundColor: config.logs[key] ? "#23a559" : "#4e5058", border: "none", cursor: "pointer", position: "relative" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: config.logs[key] ? "25px" : "3px", transition: "left 0.2s" }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ padding: "14px 32px", background: saving ? "#4e5058" : "linear-gradient(135deg, #5865f2, #7c8aff)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)" }}>
        {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
      </button>
    </div>
  );
}
