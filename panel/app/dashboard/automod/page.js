"use client";
import { useEffect, useState } from "react";

export default function AutomodPage() {
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

  const update = (key, value) => setConfig({ ...config, automod: { ...config.automod, [key]: value } });

  const addWord = () => {
    const w = prompt('Słowo do zablokowania:');
    if (w && !config.automod.badWords.includes(w)) update('badWords', [...config.automod.badWords, w]);
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}> Auto-moderacja</h1>
        <p style={{ color: "#6d7280", margin: "4px 0 0 0", fontSize: "14px" }}>Automatyczna ochrona serwera</p>
      </div>

      <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Moduły ochronne</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          {[
            { key: 'antiSpam', label: ' Anti-spam', desc: 'Blokowanie spamu wiadomościami' },
            { key: 'antiLinks', label: '🔗 Anti-linki', desc: 'Blokowanie linków' },
            { key: 'antiBadWords', label: '🤬 Anti-wulgaryzmy', desc: 'Blokowanie przekleństw' }
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", backgroundColor: "#1e2029", borderRadius: "10px" }}>
              <div>
                <div style={{ fontWeight: "500" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "#6d7280", marginTop: "2px" }}>{desc}</div>
              </div>
              <button
                onClick={() => update(key, !config.automod[key])}
                style={{ width: "48px", height: "26px", borderRadius: "13px", backgroundColor: config.automod[key] ? "#23a559" : "#4e5058", border: "none", cursor: "pointer", position: "relative" }}
              >
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: config.automod[key] ? "25px" : "3px", transition: "left 0.2s" }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {config.automod.antiSpam && (
        <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>🚫 Próg spamu</h3>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#6d7280" }}>Max wiadomości w ciągu 5 sekund</label>
          <input type="number" value={config.automod.spamThreshold} onChange={(e) => update('spamThreshold', parseInt(e.target.value))} style={{ width: "120px", padding: "12px", backgroundColor: "#1e2029", border: "1px solid #2d3139", borderRadius: "8px", color: "#fff" }} />
        </div>
      )}

      {config.automod.antiBadWords && (
        <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}> Lista zablokowanych słów</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {config.automod.badWords.map(w => (
              <span key={w} onClick={() => update('badWords', config.automod.badWords.filter(x => x !== w))} style={{ padding: "6px 12px", backgroundColor: "#ed4245", borderRadius: "20px", fontSize: "13px", cursor: "pointer" }}>{w} ✕</span>
            ))}
          </div>
          <button onClick={addWord} style={{ padding: "10px 20px", backgroundColor: "#5865f2", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "500" }}>+ Dodaj słowo</button>
        </div>
      )}

      <button onClick={save} disabled={saving} style={{ padding: "14px 32px", background: saving ? "#4e5058" : "linear-gradient(135deg, #5865f2, #7c8aff)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)" }}>
        {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
      </button>
    </div>
  );
}
