"use client";
import { useEffect, useState } from "react";

export default function TicketsPage() {
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

  const update = (key, value) => setConfig({ ...config, tickets: { ...config.tickets, [key]: value } });

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>🎫 Tickety</h1>
        <p style={{ color: "#6d7280", margin: "4px 0 0 0", fontSize: "14px" }}>Konfiguracja systemu ticketów</p>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Główne ustawienia</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280" }}>Nazwa kanału ticketu</label>
            <input value={config.tickets.ticketName} onChange={(e) => update('ticketName', e.target.value)} style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280" }}>Limit na użytkownika</label>
            <input type="number" value={config.tickets.ticketLimit} onChange={(e) => update('ticketLimit', parseInt(e.target.value))} style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Kanały Discord (ID)</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          {[
            { key: 'categoryId', label: ' ID kategorii ticketów' },
            { key: 'logChannelId', label: ' ID kanału logów' },
            { key: 'transcriptChannelId', label: '📄 ID kanału transkryptów' },
            { key: 'supportRoleId', label: '👥 ID roli supportu' }
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280" }}>{label}</label>
              <input value={config.tickets[key] || ''} onChange={(e) => update(key, e.target.value || null)} placeholder="Wklej ID z Discord" style={{ width: "100%", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ padding: "14px 32px", background: saving ? "#4e5058" : "linear-gradient(135deg, #23a559, #2ecc71)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(35, 165, 89, 0.3)" }}>
        {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
      </button>
    </div>
  );
}
