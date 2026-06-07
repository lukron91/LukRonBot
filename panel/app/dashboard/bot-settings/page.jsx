"use client";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/useTheme';
import { FiWifi, FiClock, FiCpu, FiHardDrive, FiServer, FiActivity, FiPower, FiPackage, FiList, FiInfo, FiRefreshCw } from 'react-icons/fi';

export default function BotSettingsPage() {
  const { accentColor } = useTheme();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("online");
  const [customText, setCustomText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [modules, setModules] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [dbLogs, setDbLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    try {
      const healthRes = await fetch("/api/proxy/api/bot/health");
      let healthData;
      if (healthRes.ok) {
        const text = await healthRes.text();
        try { healthData = JSON.parse(text); } catch(e) { healthData = { error: "Nieprawidłowa odpowiedź" }; }
      } else { healthData = { error: `HTTP ${healthRes.status}` }; }
      setHealth(healthData);
      if (healthData.status && !healthData.error) setStatus(healthData.status);
      if (healthData.customStatus && !healthData.error) setCustomText(healthData.customStatus);

      const modulesRes = await fetch("/api/proxy/api/modules");
      if (modulesRes.ok) setModules((await modulesRes.json()).modules || []);

      const systemRes = await fetch("/api/proxy/api/logs/system");
      if (systemRes.ok) setSystemLogs(await systemRes.json());

      const activityRes = await fetch("/api/proxy/api/logs/activity");
      if (activityRes.ok) setActivityLogs(await activityRes.json());

      const dbRes = await fetch("/api/proxy/api/logs/db");
      if (dbRes.ok) setDbLogs(await dbRes.json());
    } catch (err) {
      console.error(err);
      setHealth({ error: err.message });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const healthInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/proxy/api/bot/health");
        if (res.ok) {
          const text = await res.text();
          try { const data = JSON.parse(text); setHealth(prev => ({ ...prev, ...data })); } catch(e) {}
        }
      } catch(e) {}
    }, 15000);
    const logsInterval = setInterval(async () => {
      try {
        const [sys, act, db] = await Promise.all([
          fetch("/api/proxy/api/logs/system").then(r => r.json()),
          fetch("/api/proxy/api/logs/activity").then(r => r.json()),
          fetch("/api/proxy/api/logs/db").then(r => r.json()),
        ]);
        setSystemLogs(sys);
        setActivityLogs(act);
        setDbLogs(db);
      } catch(e) {}
    }, 10000);
    return () => { clearInterval(healthInterval); clearInterval(logsInterval); };
  }, []);

  const updateStatus = async (newStatus, newCustomText) => {
    setUpdating(true);
    setMessage("");
    try {
      const res = await fetch("/api/proxy/bot/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, customText: newCustomText }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(newStatus);
        setCustomText(newCustomText);
        setMessage("✅ Status zaktualizowany");
        const healthRes = await fetch("/api/proxy/api/bot/health");
        if (healthRes.ok) {
          const text = await healthRes.text();
          try { const healthData = JSON.parse(text); setHealth(healthData); } catch(e) {}
        }
      } else { setMessage(`❌ Błąd: ${data.error}`); }
    } catch (err) { setMessage(`❌ Błąd: ${err.message}`); }
    finally { setUpdating(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); updateStatus(status, customText); };
  const openModuleModal = (mod) => { setSelectedModule(mod); setShowModal(true); };

  const testDebugModule = async () => {
    try {
      const res = await fetch("/api/proxy/debug/test");
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "✅ Test OK");
      } else {
        alert(`❌ Błąd: HTTP ${res.status} – moduł debug nie odpowiada`);
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message} – moduł debug nie jest dostępny`);
    }
  };

  const reloadModules = async () => {
    try {
      const res = await fetch("/api/proxy/api/modules/reload", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Dodano: ${data.added.join(', ') || 'brak'}\n⚠️ Usunięte (wymagają restartu): ${data.removed.join(', ') || 'brak'}`);
        const modulesRes = await fetch("/api/proxy/api/modules");
        const modulesData = await modulesRes.json();
        setModules(modulesData.modules || []);
      } else {
        alert("❌ Błąd przeładowania");
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Ładowanie...</div>;
  if (health?.error) return <div className="error">Błąd: {health.error}</div>;

  const statusOptions = [
    { value: "online", label: "Online", icon: <FiPower />, color: "#23a55a" },
    { value: "idle", label: "Zaraz wracam", icon: <FiClock />, color: "#f0b232" },
    { value: "dnd", label: "Nie przeszkadzać", icon: <FiInfo />, color: "#ed4245" },
    { value: "invisible", label: "Niewidoczny", icon: <FiWifi />, color: "#6b6b76" },
  ];
  const healthItems = [
    { icon: <FiWifi />, title: "Ping", value: `${health?.ping ?? "—"} ms` },
    { icon: <FiClock />, title: "Uptime", value: health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : "—" },
    { icon: <FiCpu />, title: "CPU", value: `${health?.cpu ?? "—"} s` },
    { icon: <FiHardDrive />, title: "RAM", value: `${health?.ram ?? "—"} MB` },
    { icon: <FiServer />, title: "Serwery", value: health?.guilds ?? "—" },
  ];

  return (
    <div className="bot-settings-page">
      <div className="page-header">
        <h1 style={{ color: accentColor }}><FiActivity /> Zarządzanie botem</h1>
        <p>Statystyki, moduły i logi systemowe</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')} style={activeTab === 'stats' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
          <FiActivity /> Statystyki
        </button>
        <button className={`tab ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')} style={activeTab === 'modules' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
          <FiPackage /> Moduły
        </button>
        <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')} style={activeTab === 'logs' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
          <FiList /> Logi systemowe
        </button>
        <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')} style={activeTab === 'activity' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
          <FiList /> Logi aktywności
        </button>
        <button className={`tab ${activeTab === 'db' ? 'active' : ''}`} onClick={() => setActiveTab('db')} style={activeTab === 'db' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
          <FiDatabase /> Logi bazy
        </button>
      </div>

      {activeTab === 'stats' && (
        <>
          <div className="section">
            <h2 style={{ color: accentColor }}>Health bota</h2>
            <div className="health-grid">
              {healthItems.map((item, idx) => (
                <div key={idx} className="health-card" style={{ borderTopColor: accentColor }}>
                  <div className="health-icon" style={{ color: accentColor }}>{item.icon}</div>
                  <div className="health-content">
                    <div className="health-title">{item.title}</div>
                    <div className="health-value">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h2 style={{ color: accentColor }}>Status bota na Discordzie</h2>
            <form onSubmit={handleSubmit} className="status-form">
              <label>Wybierz status</label>
              <div className="status-buttons">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className="status-btn"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "40px",
                      background: status === opt.value ? opt.color : "#1e1e26", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer"
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="np. 🎮 Ulubiony towarzysz NPC?"
                maxLength={128}
                className="status-input"
              />
              <button type="submit" className="save-btn" style={{ background: accentColor }}>
                {updating ? "Aktualizowanie..." : "💾 Zaktualizuj status"}
              </button>
              {message && <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>{message}</div>}
            </form>
          </div>
        </>
      )}

      {activeTab === 'modules' && (
        <div className="section">
          <h2 style={{ color: accentColor }}>Moduły bota</h2>
          <div className="module-actions">
            <button onClick={testDebugModule} className="action-btn" style={{ background: accentColor }}>🧪 Test modułu debug</button>
            <button onClick={reloadModules} className="action-btn" style={{ background: accentColor }}><FiRefreshCw /> Przeładuj moduły</button>
          </div>
          {modules.length === 0 ? <div className="empty">Brak modułów.</div> : (
            <div className="modules-grid">
              {modules.map(mod => (
                <div key={mod.name} className="module-card" onClick={() => openModuleModal(mod)} style={{ borderLeftColor: accentColor }}>
                  <div className="module-icon">📦</div>
                  <div className="module-info">
                    <div className="module-name">{mod.name}</div>
                    <div className="module-status">{mod.status === 'active' ? '✅ aktywny' : '❌ uszkodzony'}</div>
                    {mod.error && <div className="module-error">{mod.error}</div>}
                  </div>
                  <div className="module-hint">Kliknij po opis</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="section">
          <h2 style={{ color: accentColor }}>Logi systemowe (ostatnie 200)</h2>
          <div className="logs-container">
            {systemLogs.length === 0 ? <div className="empty">Brak logów.</div> :
              systemLogs.slice(0,200).map((log,idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">[{new Date(log.timestamp).toLocaleString()}]</span>
                  <span className="log-source">[{log.source?.toUpperCase()}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            }
          </div>
          <button onClick={async () => { const res = await fetch("/api/proxy/api/logs/system"); setSystemLogs(await res.json()); }} className="refresh-btn" style={{ background: accentColor }}>Odśwież</button>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="section">
          <h2 style={{ color: accentColor }}>Logi aktywności (operacje, komendy, moduły)</h2>
          <div className="logs-container">
            {activityLogs.length === 0 ? <div className="empty">Brak logów.</div> :
              activityLogs.slice(0,200).map((log,idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">[{new Date(log.timestamp).toLocaleString()}]</span>
                  <span className="log-source">[{log.category?.toUpperCase()}]</span>
                  <span className="log-source">[{log.source?.toUpperCase()}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            }
          </div>
          <button onClick={async () => { const res = await fetch("/api/proxy/api/logs/activity"); setActivityLogs(await res.json()); }} className="refresh-btn" style={{ background: accentColor }}>Odśwież</button>
        </div>
      )}

      
      {activeTab === 'db' && (
        <div className="section">
          <h2 style={{ color: accentColor }}>Logi bazy danych (Kolekcje, Zapytania, Błędy)</h2>
          <div className="logs-container">
            {dbLogs.length === 0 ? <div className="empty">Brak logów bazy danych.</div> :
              dbLogs.slice(0,200).map((log,idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">[{new Date(log.timestamp).toLocaleString()}]</span>
                  <span className="log-source">[{log.source?.toUpperCase() || 'DB'}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            }
          </div>
          <button onClick={async () => { const res = await fetch("/api/proxy/api/logs/db"); setDbLogs(await res.json()); }} className="refresh-btn" style={{ background: accentColor }}>Odśwież</button>
        </div>
      )}
    

{showModal && selectedModule && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: accentColor }}>
              <h3 style={{ color: accentColor }}>{selectedModule.name}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p>{selectedModule.description || "Brak szczegółowego opisu."}</p>
              <p><strong>Status:</strong> {selectedModule.status === 'active' ? '✅ aktywny' : '❌ uszkodzony'}</p>
              {selectedModule.error && <p className="error-text"><strong>Błąd:</strong> {selectedModule.error}</p>}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bot-settings-page {
          margin: 100px 200px 2rem 200px;
          padding: 1.5rem;
          border: 1px solid ${accentColor};
          border-radius: 1rem;
          background: #0a0a0f;
        }
        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          color: #6b6b76;
          margin-bottom: 1.5rem;
        }
        .loading, .error, .empty {
          text-align: center;
          padding: 3rem;
          color: #6b6b76;
        }
        .error {
          color: #ef4444;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid #1e1e26;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #9c9ca7;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .tab:hover {
          color: #fff;
        }
        .section {
          background: #14141c;
          border: 1px solid #1e1e26;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .section h2 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .health-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .health-card {
          background: #1e1e26;
          border-radius: 0.5rem;
          padding: 1.5rem;
          border-top: 3px solid;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .health-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }
        .health-content {
          flex: 1;
        }
        .health-title {
          font-size: 0.9rem;
          color: #6b6b76;
          margin-bottom: 0.25rem;
        }
        .health-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }
        .status-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .status-form label {
          font-weight: 600;
          color: #fff;
        }
        .status-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .status-input {
          padding: 0.75rem;
          background: #1e1e26;
          border: 1px solid #25252d;
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.9rem;
        }
        .save-btn {
          padding: 0.75rem 1.5rem;
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          align-self: flex-start;
        }
        .save-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .message {
          padding: 0.75rem;
          border-radius: 0.5rem;
          text-align: center;
          font-weight: 600;
        }
        .message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          color: #10b981;
        }
        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
        }
        .module-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .action-btn {
          padding: 0.5rem 1rem;
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .module-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #1e1e26;
          border-radius: 0.5rem;
          border-left: 3px solid;
          cursor: pointer;
          transition: background 0.2s;
        }
        .module-card:hover {
          background: #25252d;
        }
        .module-icon {
          font-size: 1.5rem;
        }
        .module-info {
          flex: 1;
        }
        .module-name {
          font-weight: 600;
          color: #fff;
        }
        .module-status {
          font-size: 0.8rem;
          color: #6b6b76;
        }
        .module-error {
          font-size: 0.8rem;
          color: #ef4444;
          margin-top: 0.25rem;
        }
        .module-hint {
          font-size: 0.75rem;
          color: #6b6b76;
          text-align: right;
        }
        .logs-container {
          background: #0a0a0f;
          border: 1px solid #1e1e26;
          border-radius: 0.5rem;
          padding: 1rem;
          max-height: 400px;
          overflow-y: auto;
          overflow-x: auto;
          margin-bottom: 1rem;
          font-family: monospace;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .log-entry {
          padding: 0.25rem 0;
          border-bottom: 1px solid #1e1e26;
        }
        .log-time {
          color: #6b6b76;
          margin-right: 0.5rem;
        }
        .log-source {
          color: #a5b4fc;
          margin-right: 0.5rem;
        }
        .log-message {
          color: #fff;
        }
        .refresh-btn {
          padding: 0.5rem 1rem;
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #14141c;
          border: 1px solid #1e1e26;
          border-radius: 0.75rem;
          max-width: 700px;
          width: 90%;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 2px solid;
        }
        .modal-header h3 {
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: #6b6b76;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body {
          padding: 1rem;
          color: #fff;
        }
        .error-text {
          color: #ef4444;
        }
        @media (max-width: 1200px) {
          .health-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .modules-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}