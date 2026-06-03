"use client";
import { Suspense, useEffect, useState } from "react";

function ConfigContent() {
  const [guildId, setGuildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guild = params.get('guild');
    
    if (!guild) {
      window.location.href = '/dashboard';
      return;
    }
    
    setGuildId(guild);

    fetch(`/api/config?guildId=${guild}`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Config load error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}>
        <p>Ładowanie konfiguracji...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}>
        <p>Błąd ładowania konfiguracji</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, config }),
      });
      
      if (res.ok) {
        alert('✅ Zapisano konfigurację!');
      } else {
        alert('❌ Błąd zapisu!');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ Błąd zapisu!');
    } finally {
      setSaving(false);
    }
  };

  const updateModule = (module, value) => {
    setConfig(prev => ({
      ...prev,
      modules: { ...prev.modules, [module]: value }
    }));
  };

  const updateTicket = (key, value) => {
    setConfig(prev => ({
      ...prev,
      tickets: { ...prev.tickets, [key]: value }
    }));
  };

  const updateAutomod = (key, value) => {
    setConfig(prev => ({
      ...prev,
      automod: { ...prev.automod, [key]: value }
    }));
  };

  const addBadWord = () => {
    const word = prompt('Wpisz słowo do zablokowania:');
    if (word && !config.automod.badWords.includes(word)) {
      updateAutomod('badWords', [...config.automod.badWords, word]);
    }
  };

  const removeBadWord = (word) => {
    updateAutomod('badWords', config.automod.badWords.filter(w => w !== word));
  };

  return (
    <div style={{ backgroundColor: "#1a1d20", minHeight: "100vh", color: "#fff", padding: "32px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "#5865f2" }}>⚙️ Konfiguracja bota</h1>
        <p style={{ color: "#99aab5", marginBottom: "32px" }}>Serwer ID: {guildId}</p>
        
        {/* Moduły */}
        <section style={{ backgroundColor: "#23272a", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#fff" }}>🔧 Moduły</h2>
          <div style={{ display: "grid", gap: "12px" }}>
            {Object.entries(config.modules).map(([module, enabled]) => (
              <div key={module} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#2c2f33", borderRadius: "6px" }}>
                <span style={{ textTransform: "capitalize", fontWeight: "500" }}>
                  {module === 'tickets' && '🎫 Tickety'}
                  {module === 'moderation' && '🛡️ Moderacja'}
                  {module === 'welcome' && '👋 Powitania'}
                  {module === 'logs' && '📝 Logi'}
                  {module === 'automod' && '🤖 Auto-moderacja'}
                </span>
                <button
                  onClick={() => updateModule(module, !enabled)}
                  style={{
                    width: "50px",
                    height: "26px",
                    borderRadius: "13px",
                    backgroundColor: enabled ? "#23a559" : "#ed4245",
                    border: "none",
                    cursor: "pointer",
                    position: "relative"
                  }}
                >
                  <div style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    position: "absolute",
                    top: "2px",
                    left: enabled ? "26px" : "2px",
                    transition: "left 0.2s"
                  }} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Tickety */}
        {config.modules.tickets && (
          <section style={{ backgroundColor: "#23272a", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#fff" }}>🎫 Ustawienia ticketów</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Nazwa ticketa:</label>
                <input
                  type="text"
                  value={config.tickets.ticketName}
                  onChange={(e) => updateTicket('ticketName', e.target.value)}
                  placeholder="ticket-{number}"
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "#2c2f33", border: "1px solid #23272a", borderRadius: "6px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Limit ticketów:</label>
                <input
                  type="number"
                  value={config.tickets.ticketLimit}
                  onChange={(e) => updateTicket('ticketLimit', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  style={{ width: "100px", padding: "8px 12px", backgroundColor: "#2c2f33", border: "1px solid #23272a", borderRadius: "6px", color: "#fff" }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Auto-moderacja */}
        {config.modules.automod && (
          <section style={{ backgroundColor: "#23272a", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#fff" }}>🤖 Auto-moderacja</h2>
            <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
              {[
                { key: 'antiSpam', label: 'Anti-spam' },
                { key: 'antiLinks', label: 'Anti-linki' },
                { key: 'antiBadWords', label: 'Anti-wulgaryzmy' }
              ].map(({ key, label }) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#2c2f33", borderRadius: "6px" }}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={config.automod[key]}
                    onChange={(e) => updateAutomod(key, e.target.checked)}
                    style={{ width: "20px", height: "20px" }}
                  />
                </div>
              ))}
            </div>

            {config.automod.antiBadWords && (
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Zablokowane słowa:</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  {config.automod.badWords.map(word => (
                    <span 
                      key={word} 
                      onClick={() => removeBadWord(word)}
                      style={{ padding: "4px 8px", backgroundColor: "#ed4245", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                    >
                      {word} ✕
                    </span>
                  ))}
                </div>
                <button
                  onClick={addBadWord}
                  style={{ padding: "8px 16px", backgroundColor: "#5865f2", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                >
                  + Dodaj słowo
                </button>
              </div>
            )}
          </section>
        )}

        {/* Przycisk zapisu */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "16px",
            backgroundColor: saving ? "#5865f280" : "#23a559",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: saving ? "not-allowed" : "pointer",
            marginBottom: "32px"
          }}
        >
          {saving ? 'Zapisywanie...' : '💾 Zapisz konfigurację'}
        </button>

        <a href="/dashboard" style={{ display: "block", textAlign: "center", color: "#99aab5", textDecoration: "none", fontSize: "14px" }}>
          ← Powrót do dashboardu
        </a>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}><p>Ładowanie...</p></div>}>
      <ConfigContent />
    </Suspense>
  );
}
