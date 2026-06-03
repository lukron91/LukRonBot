"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ConfigPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get('guild');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard');
      return;
    }

    fetch(`/api/config?guildId=${guildId}`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Config load error:', err);
        router.push('/dashboard');
      });
  }, [guildId, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, config }),
      });
      
      if (res.ok) {
        alert('Zapisano konfigurację!');
      } else {
        alert('Błąd zapisu!');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Błąd zapisu!');
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

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}>
        <p>Ładowanie konfiguracji...</p>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div style={{ backgroundColor: "#1a1d20", minHeight: "100vh", color: "#fff", padding: "32px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "#5865f2" }}>Konfiguracja bota</h1>
        
        {/* Ogólne ustawienia */}
        <section style={{ backgroundColor: "#23272a", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#fff" }}>⚙️ Ustawienia ogólne</h2>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Prefix komend:</label>
            <input
              type="text"
              value={config.prefix}
              onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
              style={{ 
                width: "100px", 
                padding: "8px 12px", 
                backgroundColor: "#2c2f33", 
                border: "1px solid #23272a", 
                borderRadius: "6px", 
                color: "#fff",
                fontSize: "16px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Język:</label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
              style={{ 
                padding: "8px 12px", 
                backgroundColor: "#2c2f33", 
                border: "1px solid #23272a", 
                borderRadius: "6px", 
                color: "#fff",
                fontSize: "16px"
              }}
            >
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>
        </section>

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
                    position: "relative",
                    transition: "background-color 0.2s"
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
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Nazwa ticketa (użyj {`{number}`} dla numeru):</label>
                <input
                  type="text"
                  value={config.tickets.ticketName}
                  onChange={(e) => updateTicket('ticketName', e.target.value)}
                  placeholder="ticket-{number}"
                  style={{ 
                    width: "100%", 
                    padding: "8px 12px", 
                    backgroundColor: "#2c2f33", 
                    border: "1px solid #23272a", 
                    borderRadius: "6px", 
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Limit ticketów na użytkownika:</label>
                <input
                  type="number"
                  value={config.tickets.ticketLimit}
                  onChange={(e) => updateTicket('ticketLimit', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  style={{ 
                    width: "100px", 
                    padding: "8px 12px", 
                    backgroundColor: "#2c2f33", 
                    border: "1px solid #23272a", 
                    borderRadius: "6px", 
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ padding: "12px", backgroundColor: "#2c2f33", borderRadius: "6px", color: "#99aab5" }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>ID kanałów (wklej z Discord):</p>
                <div style={{ display: "grid", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="ID kategorii ticketów"
                    value={config.tickets.categoryId || ''}
                    onChange={(e) => updateTicket('categoryId', e.target.value || null)}
                    style={{ padding: "8px", backgroundColor: "#1a1d20", border: "1px solid #23272a", borderRadius: "4px", color: "#fff" }}
                  />
                  <input
                    type="text"
                    placeholder="ID kanału logów"
                    value={config.tickets.logChannelId || ''}
                    onChange={(e) => updateTicket('logChannelId', e.target.value || null)}
                    style={{ padding: "8px", backgroundColor: "#1a1d20", border: "1px solid #23272a", borderRadius: "4px", color: "#fff" }}
                  />
                  <input
                    type="text"
                    placeholder="ID kanału transkryptów"
                    value={config.tickets.transcriptChannelId || ''}
                    onChange={(e) => updateTicket('transcriptChannelId', e.target.value || null)}
                    style={{ padding: "8px", backgroundColor: "#1a1d20", border: "1px solid #23272a", borderRadius: "4px", color: "#fff" }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Auto-moderacja */}
        {config.modules.automod && (
          <section style={{ backgroundColor: "#23272a", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#fff" }}>🤖 Auto-moderacja</h2>
            
            <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#2c2f33", borderRadius: "6px" }}>
                <span>Anti-spam</span>
                <input
                  type="checkbox"
                  checked={config.automod.antiSpam}
                  onChange={(e) => updateAutomod('antiSpam', e.target.checked)}
                  style={{ width: "20px", height: "20px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#2c2f33", borderRadius: "6px" }}>
                <span>Anti-linki</span>
                <input
                  type="checkbox"
                  checked={config.automod.antiLinks}
                  onChange={(e) => updateAutomod('antiLinks', e.target.checked)}
                  style={{ width: "20px", height: "20px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#2c2f33", borderRadius: "6px" }}>
                <span>Anti-wulgaryzmy</span>
                <input
                  type="checkbox"
                  checked={config.automod.antiBadWords}
                  onChange={(e) => updateAutomod('antiBadWords', e.target.checked)}
                  style={{ width: "20px", height: "20px" }}
                />
              </div>
            </div>

            {config.automod.antiSpam && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Próg spamu (wiadomości w ciągu 5 sekund):</label>
                <input
                  type="number"
                  value={config.automod.spamThreshold}
                  onChange={(e) => updateAutomod('spamThreshold', parseInt(e.target.value))}
                  min="3"
                  max="10"
                  style={{ 
                    width: "100px", 
                    padding: "8px 12px", 
                    backgroundColor: "#2c2f33", 
                    border: "1px solid #23272a", 
                    borderRadius: "6px", 
                    color: "#fff"
                  }}
                />
              </div>
            )}

            {config.automod.antiBadWords && (
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#99aab5" }}>Zablokowane słowa:</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  {config.automod.badWords.map(word => (
                    <span 
                      key={word} 
                      style={{ 
                        padding: "4px 8px", 
                        backgroundColor: "#ed4245", 
                        borderRadius: "4px", 
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                      onClick={() => removeBadWord(word)}
                    >
                      {word} ✕
                    </span>
                  ))}
                </div>
                <button
                  onClick={addBadWord}
                  style={{ 
                    padding: "8px 16px", 
                    backgroundColor: "#5865f2", 
                    border: "none", 
                    borderRadius: "6px", 
                    color: "#fff", 
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
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

        {/* Powrót do dashboardu */}
        <a
          href="/dashboard"
          style={{ 
            display: "block", 
            textAlign: "center", 
            color: "#99aab5",
            textDecoration: "none",
            fontSize: "14px"
          }}
        >
          ← Powrót do dashboardu
        </a>
      </div>
    </div>
  );
}
