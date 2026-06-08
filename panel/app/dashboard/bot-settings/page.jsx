"use client";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';
import { FiWifi, FiClock, FiCpu, FiHardDrive, FiServer, FiActivity, FiPower, FiPackage, FiList, FiInfo, FiDatabase, FiRefreshCw, FiTerminal, FiPlus, FiTrash2, FiCheckSquare, FiSquare, FiGlobe, FiCopy, FiX } from 'react-icons/fi';

export default function BotSettingsPage() {
  const { theme, updateTheme } = useTheme();
  const accentColor = theme?.accentColor || '#3b82f6';
  const mode = theme?.mode || 'dark';

  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("online");
  const [customText, setCustomText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [modules, setModules] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [dbLogs, setDbLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [toast, setToast] = useState(null);

  const [cmdSubTab, setCmdSubTab] = useState("registration"); 
  const [memoryCommands, setMemoryCommands] = useState([]);
  const [registeredLocalCommands, setRegisteredLocalCommands] = useState([]);
  const [registeredGlobalCommands, setRegisteredGlobalCommands] = useState([]);
  const [selectedCmds, setSelectedCmds] = useState(new Set());
  const [cmdUpdating, setCmdUpdating] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Skopiowano do schowka!", "success");
  };

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

      await refreshAllCommands();
    } catch (err) {
      console.error("Error in fetchData:", err);
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
        showToast("Status zaktualizowany", "success");
        const healthRes = await fetch("/api/proxy/api/bot/health");
        if (healthRes.ok) {
          const text = await healthRes.text();
          try { const healthData = JSON.parse(text); setHealth(healthData); } catch(e) {}
        }
      } else { showToast(`Błąd: ${data.error}`, "error"); }
    } catch (err) { showToast(`Błąd: ${err.message}`, "error"); }
    finally { setUpdating(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); updateStatus(status, customText); };
  const openModuleModal = (mod) => { setSelectedModule(mod); setShowModal(true); };

  const testDebugModule = async () => {
    try {
      const res = await fetch("/api/proxy/debug/test");
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Test OK", "success");
      } else {
        showToast(`Błąd: HTTP ${res.status}`, "error");
      }
    } catch (err) {
      showToast(`Błąd: ${err.message}`, "error");
    }
  };

  const reloadModules = async () => {
    try {
      const res = await fetch("/api/proxy/api/modules/reload", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Moduły przeładowane", "success");
        const modulesRes = await fetch("/api/proxy/api/modules");
        const modulesData = await modulesRes.json();
        setModules(modulesData.modules || []);
      } else {
        showToast("Błąd przeładowania", "error");
      }
    } catch (err) {
      showToast(`Błąd: ${err.message}`, "error");
    }
  };

  const refreshAllCommands = async () => {
    try {
      const [memRes, localRes, globalRes] = await Promise.all([
        fetch("/api/proxy/api/commands").then(r => r.json()),
        guildId ? fetch('/api/proxy/api/commands/registered-guild/' + guildId).then(r => r.json()) : Promise.resolve({ commands: [] }),
        fetch("/api/proxy/api/commands/registered-global").then(r => r.json()),
      ]);
      setMemoryCommands(memRes.commands || []);
      setRegisteredLocalCommands(localRes.commands || []);
      setRegisteredGlobalCommands(globalRes.commands || []);
    } catch (err) {
      console.error("Error refreshing commands:", err);
    }
  };

  const toggleCommandSelection = (name) => {
    const newSelected = new Set(selectedCmds);
    if (newSelected.has(name)) newSelected.delete(name);
    else newSelected.add(name);
    setSelectedCmds(newSelected);
  };

  const manageCommands = async (action, commandNames = null) => {
    setCmdUpdating(true);
    const endpoint = action === 'register' ? '/api/commands/register' : '/api/commands/unregister';
    const finalNames = commandNames || (action === 'register' ? Array.from(selectedCmds) : null);

    try {
      const res = await fetch(`/api/proxy${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: cmdSubTab === 'global' ? 'global' : 'guild', 
          guildId: guildId, 
          commandNames: finalNames 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${action === 'register' ? 'Zarejestrowano' : 'Usunięto'} komendy`, "success");
        await refreshAllCommands();
      } else {
        showToast(`Błąd: ${data.error}`, "error");
      }
    } catch (err) {
      showToast(`Błąd: ${err.message}`, "error");
    } finally {
      setCmdUpdating(false);
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
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-content">
            <span>{toast.message}</span>
            {toast.type === 'error' && (
              <button onClick={() => copyToClipboard(toast.message)} className="btn-base btn-standard" style={{ padding: "0.3rem 0.6rem", minWidth: "auto" }} title="Kopiuj błąd">
                <FiCopy />
              </button>
            )}
          </div>
          <button onClick={() => setToast(null)} className="btn-base btn-dnd" style={{ padding: "0.2rem 0.4rem", minWidth: "auto" }}><FiX /></button>
        </div>
      )}

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
        <button className={`tab ${activeTab === 'commands' ? 'active' : ''}`} onClick={() => setActiveTab('commands')} style={activeTab === 'commands' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
          <FiTerminal /> Komendy
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
                    className="btn-status"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "40px",
                      background: status === opt.value ? opt.color : "var(--surface-color)", border: "1px solid var(--border-color)", color: "var(--text-color)", cursor: "pointer"
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
              <button type="submit" className="btn-base btn-success">
                {updating ? "Aktualizowanie..." : "💾 Zaktualizuj status"}
              </button>
            </form>
          </div>
        </>
      )}

      {activeTab === 'modules' && (
        <div className="section">
          <h2 style={{ color: accentColor }}>Moduły bota</h2>
          <div className="module-actions">
            <button onClick={testDebugModule} className="btn-base btn-standard">🧪 Test modułu debug</button>
            <button onClick={reloadModules} className="btn-base btn-standard"><FiRefreshCw /> Przeładuj moduły</button>
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

      {activeTab === 'commands' && (
        <div className="section">
          <h2 style={{ color: accentColor }}>Zarządzanie Komendami Slash</h2>
          
          <div className="sub-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <button 
              className={`sub-tab ${cmdSubTab === 'registration' ? 'active' : ''}`} 
              onClick={() => setCmdSubTab('registration')}
              style={cmdSubTab === 'registration' ? { borderBottomColor: accentColor, color: accentColor } : {}}
            >
              <FiPlus /> Rejestracja
            </button>
            <button 
              className={`sub-tab ${cmdSubTab === 'local' ? 'active' : ''}`} 
              onClick={() => setCmdSubTab('local')}
              style={cmdSubTab === 'local' ? { borderBottomColor: accentColor, color: accentColor } : {}}
            >
              <FiServer /> Zarejestrowane Lokalnie
            </button>
            <button 
              className={`sub-tab ${cmdSubTab === 'global' ? 'active' : ''}`} 
              onClick={() => setCmdSubTab('global')}
              style={cmdSubTab === 'global' ? { borderBottomColor: accentColor, color: accentColor } : {}}
            >
              <FiGlobe /> Zarejestrowane Globalnie
            </button>
          </div>

          {cmdSubTab === 'registration' && (
            <>
              <div className="command-setup" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={refreshAllCommands} className="btn-base btn-standard"><FiRefreshCw /> Odśwież listę z pamięci</button>
              </div>

              <div className="command-bulk-actions" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button 
                  onClick={() => { setCmdRegType('global'); manageCommands('register'); }} 
                  className="btn-base btn-standard">
                  <FiPlus /> Zarejestruj wybrane Globalnie
                </button>
                <button 
                  onClick={() => { setCmdRegType('guild'); manageCommands('register'); }} 
                  className="btn-base btn-standard">
                  <FiPlus /> Zarejestruj wybrane Lokalnie
                </button>
                <button 
                  onClick={() => manageCommands('register', null)} 
                  className="btn-base btn-standard"
                >
                  Zarejestruj Wszystkie (Lokalnie)
                </button>
              </div>

              {cmdMessage && <div className={`message ${cmdMessage.startsWith('✅') ? 'success' : 'error'}`} style={{ marginBottom: '1rem' }}>{cmdMessage}</div>}

              <div className="commands-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="commands-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-color)' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${accentColor}`, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <th style={{ padding: '1rem', width: '40px' }}>Wybierz</th>
                      <th style={{ padding: '1rem' }}>Nazwa</th>
                      <th style={{ padding: '1rem' }}>Opis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memoryCommands.length === 0 ? (
                      <tr><td colSpan="3" className="empty" style={{ padding: '2rem' }}>Brak załadowanych komend w pamięci bota.</td></tr>
                    ) : (
                      memoryCommands.map((cmd, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div onClick={() => toggleCommandSelection(cmd.name)} style={{ cursor: 'pointer', color: accentColor, fontSize: '1.2rem' }}>
                              {selectedCmds.has(cmd.name) ? <FiCheckSquare /> : <FiSquare />}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: '600' }}>/{cmd.name}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{cmd.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {cmdSubTab === 'local' && (
            <div className="registered-list">
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                 <h3 style={{ color: 'var(--text-color)', fontSize: '1rem' }}>Komendy aktywne na tym serwerze</h3>
                 <button onClick={refreshAllCommands} className="btn-base btn-standard" style={{ fontSize: "0.8rem" }}><FiRefreshCw /> Odśwież</button>
               </div>
               {registeredLocalCommands.length === 0 ? <div className="empty">Brak zarejestrowanych komend lokalnie.</div> : (
                 <div className="commands-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                   {registeredLocalCommands.map((cmd, idx) => {
                     const isGlobal = registeredGlobalCommands.some(g => g.name === cmd.name);
                     return (
                       <div key={idx} className="module-card" style={{ borderLeftColor: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div className="module-info">
                           <div className="module-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             /{cmd.name} {isGlobal && <span style={{ fontSize: '0.6rem', background: '#6b6b76', padding: '2px 4px', borderRadius: '4px', color: 'white' }}>Globalna</span>}
                           </div>
                           <div className="module-status" style={{ fontSize: '0.75rem' }}>{cmd.description}</div>
                         </div>
                         <button 
                           onClick={() => manageCommands('unregister', [cmd.name])}
                           className="btn-base btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                         >
                           <FiTrash2 /> Usuń
                         </button>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          )}

          {cmdSubTab === 'global' && (
            <div className="registered-list">
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                 <h3 style={{ color: 'var(--text-color)', fontSize: '1rem' }}>Komendy aktywne globalnie</h3>
                 <button onClick={refreshAllCommands} className="btn-base btn-standard" style={{ fontSize: "0.8rem" }}><FiRefreshCw /> Odśwież</button>
               </div>
               {registeredGlobalCommands.length === 0 ? <div className="empty">Brak zarejestrowanych komend globalnie.</div> : (
                 <div className="commands-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                   {registeredGlobalCommands.map((cmd, idx) => (
                     <div key={idx} className="module-card" style={{ borderLeftColor: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div className="module-info">
                         <div className="module-name">/{cmd.name}</div>
                         <div className="module-status" style={{ fontSize: '0.75rem' }}>{cmd.description}</div>
                       </div>
                       <button 
                         onClick={() => manageCommands('unregister', [cmd.name])}
                         className="btn-base btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                       >
                         <FiTrash2 /> Usuń
                       </button>
                     </div>
                   ))}
                 </div>
               )}
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
          <button onClick={async () => { const res = await fetch("/api/proxy/api/logs/system"); setSystemLogs(await res.json()); }} className="btn-base btn-standard">Odśwież</button>
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
          <button onClick={async () => { const res = await fetch("/api/proxy/api/logs/activity"); setActivityLogs(await res.json()); }} className="btn-base btn-standard">Odśwież</button>
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
          <button onClick={async () => { const res = await fetch("/api/proxy/api/logs/db"); setDbLogs(await res.json()); }} className="btn-base btn-standard">Odśwież</button>
        </div>
      )}

{showModal && selectedModule && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: accentColor }}>
              <h3 style={{ color: accentColor }}>{selectedModule.name}</h3>
              <button onClick={() => setShowModal(false)} className="btn-base btn-dnd" style={{ padding: "0.25rem 0.5rem", minWidth: "auto" }}>✕</button>
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
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          background: transparent;
          position: relative;
        }
        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }
        .loading, .error, .empty {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }
        .error {
          color: #ef4444;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .tab:hover {
          color: #fff;
        }
        .section {
          background: rgba(var(--surface-rgb), var(--surface-opacity));
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(12px);
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
          background: rgba(var(--surface-rgb), 0.5);
          border-radius: var(--border-radius);
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
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }
        .health-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-color);
        }
        .status-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .status-form label {
          font-weight: 600;
          color: var(--text-color);
        }
        .status-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .status-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
          color: var(--text-color);
          cursor: pointer;
        }
        .status-input {
          padding: 0.5rem;
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
          background: var(--bg-color);
          color: var(--text-color);
          text-align: center;
          width: 60px;
        }
        .status-text {
          font-weight: 600;
          font-size: 0.85rem;
        }
        .message {
          padding: 0.75rem;
          border-radius: var(--border-radius);
          text-align: center;
          font-weight: 600;
        }
        .message.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .module-card {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 1rem;
        }
        .module-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .module-status {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          margin-top: 0.5rem;
          font-weight: 600;
        }
        .module-status.loaded {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .module-status.unloaded {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
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
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
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
.modal-body {
          padding: 1rem;
          color: var(--text-color);
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
        .sub-tab {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .sub-tab.active {
          color: #fff;
        }
        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: var(--border-radius);
          color: white;
          font-weight: 600;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          animation: slideIn 0.3s ease-out;
          min-width: 300px;
          max-width: 500px;
        }
        .toast-notification.success {
          background: #10b981;
          border-left: 5px solid #059669;
        }
        .toast-notification.error {
          background: #ef4444;
          border-left: 5px solid #dc2626;
        }
        .toast-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
.toast-copy-btn:hover {
          background: rgba(255,255,255,0.3);
        }
.toast-close-btn:hover {
          opacity: 1;
        }
        @keyframes slideIn {
          from { transform: translateX(120%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
