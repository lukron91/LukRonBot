"use client";
import { useEffect, useState } from "react";

export default function ModerationPage() {
  const [guildId, setGuildId] = useState(null);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCommand, setNewCommand] = useState('');
  const [newRole, setNewRole] = useState('');
  const [commands, setCommands] = useState([]);
  const [modRoles, setModRoles] = useState([]);

  useEffect(() => {
    const guild = new URLSearchParams(window.location.search).get('guild');
    if (!guild) { window.location.href = '/dashboard'; return; }
    setGuildId(guild);
    fetch(`/api/config?guildId=${guild}`).then(r => r.json()).then(d => {
      setConfig(d);
      setCommands(d.moderation?.commands || []);
      setModRoles(d.moderation?.modRoles || []);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const updated = { ...config, moderation: { ...config.moderation, commands, modRoles } };
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guildId, config: updated }) });
    alert('✅ Zapisano!');
    setSaving(false);
  };

  if (!config) return <p style={{ color: "#6d7280" }}>Ładowanie...</p>;

  const addCommand = () => {
    if (newCommand && !commands.includes(newCommand)) {
      setCommands([...commands, newCommand]);
      setNewCommand('');
    }
  };

  const addRole = () => {
    if (newRole && !modRoles.includes(newRole)) {
      setModRoles([...modRoles, newRole]);
      setNewRole('');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>🛡️ Moderacja</h1>
        <p style={{ color: "#6d7280", margin: "4px 0 0 0", fontSize: "14px" }}>Zarządzanie moderacją serwera</p>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}> Komendy moderacyjne</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {commands.map(c => (
            <span key={c} onClick={() => setCommands(commands.filter(x => x !== c))} style={{ padding: "6px 12px", backgroundColor: "#5865f2", borderRadius: "20px", fontSize: "13px", cursor: "pointer" }}>{c} ✕</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={newCommand} onChange={(e) => setNewCommand(e.target.value)} placeholder="np. ban, kick, mute" style={{ flex: 1, padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff" }} />
          <button onClick={addCommand} style={{ padding: "12px 20px", backgroundColor: "#5865f2", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "500" }}>Dodaj</button>
        </div>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>👥 Role moderatorskie</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {modRoles.map(r => (
            <span key={r} onClick={() => setModRoles(modRoles.filter(x => x !== r))} style={{ padding: "6px 12px", backgroundColor: "#faa61a", borderRadius: "20px", fontSize: "13px", cursor: "pointer" }}>{r} ✕</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="ID roli moderatora" style={{ flex: 1, padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff" }} />
          <button onClick={addRole} style={{ padding: "12px 20px", backgroundColor: "#5865f2", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "500" }}>Dodaj</button>
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ padding: "14px 32px", background: saving ? "#4e5058" : "linear-gradient(135deg, #5865f2, #7c8aff)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)" }}>
        {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
      </button>
    </div>
  );
}
