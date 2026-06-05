"use client";
import { useEffect, useState } from "react";
import { FiWifi, FiClock, FiCpu, FiHardDrive, FiServer, FiActivity, FiPower, FiPackage, FiList, FiInfo, FiRefreshCw } from 'react-icons/fi';

export default function BotSettingsPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("online");
  const [customText, setCustomText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [modules, setModules] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    try {
      const healthRes = await fetch("http://localhost:3001/bot/health");
      let healthData;
      if (healthRes.ok) {
        const text = await healthRes.text();
        try { healthData = JSON.parse(text); } catch(e) { healthData = { error: "Nieprawidłowa odpowiedź" }; }
      } else { healthData = { error: `HTTP ${healthRes.status}` }; }
      setHealth(healthData);
      if (healthData.status && !healthData.error) setStatus(healthData.status);
      if (healthData.customStatus && !healthData.error) setCustomText(healthData.customStatus);
      
      const modulesRes = await fetch("http://localhost:3001/api/modules");
      if (modulesRes.ok) setModules((await modulesRes.json()).modules || []);
      
      const systemRes = await fetch("http://localhost:3001/api/logs/system");
      if (systemRes.ok) setSystemLogs(await systemRes.json());
      
      const activityRes = await fetch("http://localhost:3001/api/logs/activity");
      if (activityRes.ok) setActivityLogs(await activityRes.json());
    } catch (err) {
      console.error(err);
      setHealth({ error: err.message });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const healthInterval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3001/bot/health");
        if (res.ok) {
          const text = await res.text();
          try { const data = JSON.parse(text); setHealth(prev => ({ ...prev, ...data })); } catch(e) {}
        }
      } catch(e) {}
    }, 15000);
    const logsInterval = setInterval(async () => {
      try {
        const [sys, act] = await Promise.all([
          fetch("http://localhost:3001/api/logs/system").then(r => r.json()),
          fetch("http://localhost:3001/api/logs/activity").then(r => r.json()),
        ]);
        setSystemLogs(sys);
        setActivityLogs(act);
      } catch(e) {}
    }, 10000);
    return () => { clearInterval(healthInterval); clearInterval(logsInterval); };
  }, []);

  const updateStatus = async (newStatus, newCustomText) => {
    setUpdating(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:3001/bot/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, customText: newCustomText }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(newStatus);
        setCustomText(newCustomText);
        setMessage("✅ Status zaktualizowany");
        const healthRes = await fetch("http://localhost:3001/bot/health");
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
      const res = await fetch("http://localhost:3001/debug/test");
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
      const res = await fetch("http://localhost:3001/api/modules/reload", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Dodano: ${data.added.join(', ') || 'brak'}\n⚠️ Usunięte (wymagają restartu): ${data.removed.join(', ') || 'brak'}`);
        // Odśwież listę modułów
        const modulesRes = await fetch("http://localhost:3001/api/modules");
        const modulesData = await modulesRes.json();
        setModules(modulesData.modules || []);
      } else {
        alert("❌ Błąd przeładowania");
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    }
  };

  if (loading) return <div className="config-container" style={{ textAlign: 'center', marginTop: '3rem' }}>Ładowanie...</div>;
  if (health?.error) return <div className="config-container" style={{ textAlign: 'center', marginTop: '3rem', color: '#f87171' }}>Błąd: {health.error}</div>;

  const statusOptions = [
    { value: "online", label: "Online", icon: <FiActivity />, color: "#23a55a" },
    { value: "idle", label: "Zaraz wracam", icon: <FiClock />, color: "#f0b232" },
    { value: "dnd", label: "Nie przeszkadzać", icon: <FiPower />, color: "#ed4245" },
    { value: "invisible", label: "Niewidoczny", icon: <FiPower />, color: "#6b6b76" },
  ];
  const healthItems = [
    { icon: <FiWifi />, title: "Ping", value: `${health?.ping ?? "—"} ms` },
    { icon: <FiClock />, title: "Uptime", value: health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : "—" },
    { icon: <FiCpu />, title: "CPU", value: `${health?.cpu ?? "—"} s` },
    { icon: <FiHardDrive />, title: "RAM", value: `${health?.ram ?? "—"} MB` },
    { icon: <FiServer />, title: "Serwery", value: health?.guilds ?? "—" },
  ];

  return (
    <div className="config-container">
      <div className="config-header">
        <h1>Zarządzanie botem</h1>
        <p className="config-sub">Statystyki, moduły i logi systemowe</p>
      </div>

      <div className="settings-tabs">
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}><FiActivity /> Statystyki</button>
        <button className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}><FiPackage /> Moduły</button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}><FiList /> Logi systemowe</button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}><FiList /> Logi aktywności</button>
      </div>

      {activeTab === 'stats' && (
        <>
          <div className="settings-card">
            <div className="card-title"><FiActivity /> Health bota</div>
            <div className="health-grid">
              {healthItems.map((item, idx) => (
                <div key={idx} className="health-card">
                  <div className="health-icon">{item.icon}</div>
                  <div className="health-content"><span className="health-title">{item.title}</span><span className="health-value">{item.value}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div className="settings-card">
            <div className="card-title"><FiActivity /> Status bota na Discordzie</div>
            <form onSubmit={handleSubmit}>
              <div className="form-label">Wybierz status</div>
              <div className="status-buttons" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {statusOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setStatus(opt.value)} className="status-btn" style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "40px",
                    background: status === opt.value ? opt.color : "#1e1e26", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer"
                  }}>{opt.icon} {opt.label}</button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Tekst statusu (custom)</label>
                <input type="text" className="form-input" value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="np. 🎮 Ulubiony towarzysz NPC?" maxLength={128} />
              </div>
              <button type="submit" className="btn-primary" disabled={updating}>{updating ? "Aktualizowanie..." : "💾 Zaktualizuj status"}</button>
              {message && <p className="message">{message}</p>}
            </form>
          </div>
        </>
      )}

      {activeTab === 'modules' && (
        <div className="settings-card">
          <div className="card-title"><FiPackage /> Moduły bota</div>
          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={testDebugModule} className="test-module-btn" style={{ background: "#5865f2", border: "none", borderRadius: "0.5rem", padding: "0.3rem 0.8rem", cursor: "pointer", color: "white" }}>
              🧪 Test modułu debug
            </button>
            <button onClick={reloadModules} className="reload-modules-btn" style={{ background: "#1e1e26", border: "1px solid #2a2a30", borderRadius: "0.5rem", padding: "0.3rem 0.8rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <FiRefreshCw /> Przeładuj moduły
            </button>
          </div>
          {modules.length === 0 ? <p>Brak modułów.</p> : (
            <div className="health-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {modules.map(mod => (
                <div key={mod.name} className="health-card module-card" style={{ flexDirection: "column", textAlign: "center", cursor: "pointer" }} onClick={() => openModuleModal(mod)}>
                  <div className="health-icon">📦</div>
                  <span className="health-title">{mod.name}</span>
                  <span style={{ fontSize: "0.7rem", color: mod.status === 'active' ? '#4ade80' : '#f87171' }}>{mod.status === 'active' ? '✅ aktywny' : '❌ uszkodzony'}</span>
                  {mod.error && <span className="form-hint" style={{ color: '#f87171' }}>{mod.error}</span>}
                  <span style={{ fontSize: "0.7rem", marginTop: "0.3rem", color: "#a5b4fc", display: "flex", alignItems: "center", gap: "0.2rem" }}><FiInfo /> Kliknij po opis</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="settings-card">
          <div className="card-title"><FiList /> Logi systemowe (ostatnie 200)</div>
          <div className="logs-container">
            {systemLogs.length === 0 ? <p>Brak logów.</p> : systemLogs.slice(0,200).map((log,idx) => (
              <div key={idx} className={`log-item ${log.type === 'error' ? 'log-error' : ''}`}>
                <span className="log-time">[{new Date(log.timestamp).toLocaleString()}]</span>
                <span className="log-source">[{log.source?.toUpperCase()}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
          <button className="refresh-logs" onClick={async () => { const res = await fetch("http://localhost:3001/api/logs/system"); setSystemLogs(await res.json()); }}>Odśwież</button>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="settings-card">
          <div className="card-title"><FiList /> Logi aktywności (operacje, komendy, moduły)</div>
          <div className="logs-container">
            {activityLogs.length === 0 ? <p>Brak logów.</p> : activityLogs.slice(0,200).map((log,idx) => (
              <div key={idx} className={`log-item ${log.type === 'error' ? 'log-error' : log.type === 'warn' ? 'log-warn' : ''}`}>
                <span className="log-time">[{new Date(log.timestamp).toLocaleString()}]</span>
                <span className="log-category">[{log.category?.toUpperCase()}]</span>
                <span className="log-source">[{log.source?.toUpperCase()}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
          <button className="refresh-logs" onClick={async () => { const res = await fetch("http://localhost:3001/api/logs/activity"); setActivityLogs(await res.json()); }}>Odśwież</button>
        </div>
      )}

      {showModal && selectedModule && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedModule.name}</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>{selectedModule.description || "Brak szczegółowego opisu."}</p>
              <p><strong>Status:</strong> {selectedModule.status === 'active' ? '✅ aktywny' : '❌ uszkodzony'}</p>
              {selectedModule.error && <p><strong>Błąd:</strong> {selectedModule.error}</p>}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid #2a2a30; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .tab-btn { background: none; border: none; padding: 0.6rem 1.2rem; color: #9c9ca7; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; border-radius: 0.5rem 0.5rem 0 0; transition: all 0.2s; }
        .tab-btn:hover { color: #e1e1e6; background: #1a1a22; }
        .tab-btn.active { color: #a5b4fc; border-bottom: 2px solid #5865f2; }
        .logs-container { background: #0a0a0f; border-radius: 0.75rem; padding: 0.5rem; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 0.75rem; margin-bottom: 1rem; }
        .log-item { padding: 0.2rem 0.4rem; border-bottom: 1px solid #1e1e26; display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .log-time { color: #6b6b76; }
        .log-source { font-weight: bold; color: #a5b4fc; }
        .log-category { color: #c7d2fe; }
        .log-message { color: #e1e1e6; }
        .log-error .log-message { color: #f87171; }
        .log-warn .log-message { color: #fbbf24; }
        .refresh-logs { background: #1e1e26; border: 1px solid #2a2a30; border-radius: 0.5rem; padding: 0.4rem 0.8rem; cursor: pointer; }
        .health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .health-card { background: #1a1a22; border-radius: 1rem; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 1rem; border: 1px solid #2a2a30; }
        .health-icon { font-size: 1.6rem; width: 44px; height: 44px; background: rgba(88,101,242,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .health-content { flex: 1; display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
        .health-title { font-size: 0.85rem; font-weight: 500; color: #9c9ca7; }
        .health-value { font-size: 1rem; font-weight: 600; color: #e1e1e6; }
        .form-label { display: block; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .form-input { width: 100%; background: #1a1a22; border: 1px solid #2a2a30; border-radius: 0.75rem; padding: 0.6rem 0.8rem; color: #e1e1e6; }
        .btn-primary { background: linear-gradient(135deg, #5865f2, #4752c4); border: none; border-radius: 0.75rem; padding: 0.6rem 1.2rem; color: white; font-weight: 600; cursor: pointer; }
        .settings-card { background: #14141c; border-radius: 1rem; padding: 1.2rem; margin-bottom: 1.5rem; border: 1px solid #25252d; }
        .card-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; color: #a5b4fc; }
        .module-card { cursor: pointer; transition: all 0.2s; }
        .module-card:hover { border-color: #5865f2; transform: translateY(-2px); }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #14141c; border-radius: 1rem; width: 90%; max-width: 500px; border: 1px solid #2a2a30; overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #2a2a30; }
        .modal-header h3 { margin: 0; color: #a5b4fc; }
        .close-modal { background: none; border: none; color: #8b8ba0; font-size: 1.2rem; cursor: pointer; }
        .modal-body { padding: 1.5rem; }
        .message { margin-top: 1rem; text-align: center; }
      `}</style>
    </div>
  );
}