"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiX, FiAlertTriangle, FiBellOff, FiLock, FiRefreshCw } from 'react-icons/fi';

export default function UsersPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [punishments, setPunishments] = useState({ warnings: [], mutes: [], bans: [] });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [muteDuration, setMuteDuration] = useState(60);
  const [warnReason, setWarnReason] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [serverConfig, setServerConfig] = useState(null);
  const fetchAbortRef = useRef(null);

  const fetchMembers = async (showRefresh = false) => {
    if (!guildId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/members`, { signal: controller.signal });
      const data = await res.json();
      let usersArray = [];
      if (Array.isArray(data)) usersArray = data;
      else if (data?.users) usersArray = data.users;
      else if (data?.members) usersArray = data.members;
      setUsers(usersArray);
      setFilteredUsers(usersArray);
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      if (showRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    return () => { if (fetchAbortRef.current) fetchAbortRef.current.abort(); };
  }, [guildId]);

  useEffect(() => {
    const usersArray = Array.isArray(users) ? users : [];
    if (searchTerm === "") {
      setFilteredUsers(usersArray);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = usersArray.filter(user => 
        (user.username?.toLowerCase().includes(term) || 
         user.displayName?.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchPunishments = async (userId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/punishments/${userId}`);
      const data = await res.json();
      setPunishments(data);
    } catch (err) {
      console.error(err);
      setPunishments({ warnings: [], mutes: [], bans: [] });
    }
  };

  const fetchServerConfig = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/config`);
      const data = await res.json();
      setServerConfig(data);
    } catch (err) { console.error(err); }
  };

  const openActionMenu = async (user) => {
    setSelectedUser(user);
    setActionMenu(user.id);
    await Promise.all([fetchPunishments(user.id), fetchServerConfig()]);
    setActionMessage("");
    setWarnReason("");
    setMuteReason("");
    setBanReason("");
    setMuteDuration(60);
  };

  const closeActionMenu = () => {
    setSelectedUser(null);
    setActionMenu(null);
    setPunishments({ warnings: [], mutes: [], bans: [] });
  };

  const executeAction = async (action) => {
    setActionLoading(true);
    setActionMessage("");
    let body = {};
    switch (action) {
      case 'warn':
        if (!warnReason.trim()) {
          setActionMessage("❌ Podaj powód warnu");
          setActionLoading(false);
          return;
        }
        body = { userId: selectedUser.id, reason: warnReason, moderatorId: 'panel' };
        break;
      case 'mute':
        if (!muteReason.trim()) {
          setActionMessage("❌ Podaj powód wyciszenia");
          setActionLoading(false);
          return;
        }
        body = { userId: selectedUser.id, duration: muteDuration, reason: muteReason, moderatorId: 'panel' };
        break;
      case 'ban':
        if (!banReason.trim()) {
          setActionMessage("❌ Podaj powód bana");
          setActionLoading(false);
          return;
        }
        body = { userId: selectedUser.id, reason: banReason, moderatorId: 'panel' };
        if (serverConfig?.banMethod === 'role') {
          body.banType = 'role';
          if (serverConfig.banRoleId) body.roleId = serverConfig.banRoleId;
        }
        break;
      default: return;
    }
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✅ ${action === 'mute' ? 'Wyciszono' : action === 'ban' ? 'Zbanowano' : 'Dodano warn'} pomyślnie`);
        if (action === 'warn') {
          await fetchPunishments(selectedUser.id);
          setWarnReason("");
        }
        setTimeout(() => closeActionMenu(), 2000);
      } else {
        setActionMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`❌ Błąd połączenia: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!guildId) {
    return <div className="config-container" style={{ textAlign: 'center', marginTop: '3rem', color: '#6b6b76' }}>
      Wybierz serwer z lewego menu.
    </div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h2>Lista użytkowników</h2>
        <div className="header-actions">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Szukaj po nazwie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <FiX className="clear-icon" onClick={() => setSearchTerm("")} />}
          </div>
          <button onClick={() => fetchMembers(true)} disabled={loading || refreshing} className="refresh-btn">
            <FiRefreshCw className={refreshing ? 'spin' : ''} /> Odśwież
          </button>
        </div>
      </div>

      {loading && !refreshing ? (
        <div className="loading">Ładowanie użytkowników...</div>
      ) : (
        <div className="users-grid">
          {filteredUsers.length === 0 ? (
            <div className="no-users">Brak użytkowników spełniających kryteria.</div>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-avatar">
                  {user.avatar ? (
                    <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} alt="" />
                  ) : (
                    <div className="avatar-placeholder">{user.username?.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{user.displayName || user.username}</div>
                  <div className="user-username">@{user.username}</div>
                  <div className="user-id">ID: {user.id}</div>
                </div>
                <button className="action-btn" onClick={() => openActionMenu(user)}>
                  Akcje
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {actionMenu && selectedUser && (
        <div className="action-modal-overlay" onClick={closeActionMenu}>
          <div className="action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="action-modal-header">
              <h3>Akcje dla {selectedUser.displayName || selectedUser.username}</h3>
              <button className="close-modal" onClick={closeActionMenu}>✕</button>
            </div>
            <div className="action-modal-body">
              {/* Historia kar */}
              <div className="action-section">
                <div className="section-title">📜 Historia kar</div>
                {punishments.warnings.length === 0 && punishments.mutes.length === 0 && punishments.bans.length === 0 && (
                  <div className="no-warnings">Brak kar</div>
                )}
                {punishments.warnings.length > 0 && (
                  <>
                    <div className="sub-section-title">⚠️ Warny ({punishments.warnings.length})</div>
                    {punishments.warnings.map((w, idx) => (
                      <div key={idx} className="punishment-item">
                        <div className="punishment-reason">{w.reason}</div>
                        <div className="punishment-meta">Moderator: {w.moderatorId === 'panel' ? 'Panel' : `<@${w.moderatorId}>`} • {new Date(w.date).toLocaleString()}</div>
                      </div>
                    ))}
                  </>
                )}
                {punishments.mutes.length > 0 && (
                  <>
                    <div className="sub-section-title">🔇 Wyciszenia</div>
                    {punishments.mutes.map((m, idx) => (
                      <div key={idx} className="punishment-item">
                        <div className="punishment-reason">{m.reason}</div>
                        <div className="punishment-meta">Czas: {Math.floor(m.duration / 60)} min • {new Date(m.date).toLocaleString()}</div>
                      </div>
                    ))}
                  </>
                )}
                {punishments.bans.length > 0 && (
                  <>
                    <div className="sub-section-title">🔨 Bany</div>
                    {punishments.bans.map((b, idx) => (
                      <div key={idx} className="punishment-item">
                        <div className="punishment-reason">{b.reason}</div>
                        <div className="punishment-meta">Typ: {b.type === 'discord' ? 'Discord Ban' : 'Custom ban (rola)'} • {new Date(b.date).toLocaleString()}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Dodawanie warnu */}
              <div className="action-section">
                <div className="section-title">➕ Dodaj warn</div>
                <textarea
                  className="warn-input"
                  placeholder="Powód warnu..."
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  rows={2}
                />
                <button className="action-warn" onClick={() => executeAction('warn')} disabled={actionLoading || !warnReason.trim()}>
                  <FiAlertTriangle /> Dodaj warn
                </button>
              </div>

              {/* Wyciszenie */}
              <div className="action-section">
                <div className="section-title">🔇 Wycisz</div>
                <textarea
                  className="warn-input"
                  placeholder="Powód wyciszenia..."
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  rows={2}
                />
                <div className="mute-options">
                  <select value={muteDuration} onChange={(e) => setMuteDuration(Number(e.target.value))}>
                    <option value={60}>1 minuta</option>
                    <option value={300}>5 minut</option>
                    <option value={600}>10 minut</option>
                    <option value={1800}>30 minut</option>
                    <option value={3600}>1 godzina</option>
                    <option value={86400}>24 godziny</option>
                  </select>
                  <button className="action-mute" onClick={() => executeAction('mute')} disabled={actionLoading || !muteReason.trim()}>
                    <FiBellOff /> Wycisz
                  </button>
                </div>
              </div>

              {/* Ban */}
              <div className="action-section">
                <div className="section-title">🔨 Ban</div>
                <textarea
                  className="warn-input"
                  placeholder="Powód bana..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                />
                <button className="action-ban" onClick={() => executeAction('ban')} disabled={actionLoading || !banReason.trim()}>
                  <FiLock /> Zbanuj
                </button>
                <div className="ban-info">
                  {serverConfig?.banMethod === 'role' 
                    ? 'Użytkownik otrzyma rolę (custom ban) – skonfiguruj rolę w ustawieniach moderacji.'
                    : 'Użytkownik zostanie zbanowany standardowym banem Discord.'}
                </div>
              </div>

              {actionMessage && <div className="action-message">{actionMessage}</div>}
              {actionLoading && <div className="action-loading">Przetwarzanie...</div>}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .users-container { padding: 1rem; }
        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .users-header h2 { color: #e1e1e6; font-size: 1.5rem; margin: 0; }
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .search-box {
          display: flex;
          align-items: center;
          background: #1a1a22;
          border: 1px solid #2a2a30;
          border-radius: 2rem;
          padding: 0.5rem 1rem;
          gap: 0.5rem;
        }
        .search-icon { color: #6b6b76; }
        .search-box input {
          background: none;
          border: none;
          color: #e1e1e6;
          outline: none;
          min-width: 250px;
        }
        .clear-icon { color: #6b6b76; cursor: pointer; }
        .refresh-btn {
          background: #1e1e26;
          border: 1px solid #2a2a30;
          border-radius: 2rem;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .refresh-btn:hover { background: #2a2a34; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .user-card {
          background: #14141c;
          border-radius: 1rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid #25252d;
          transition: all 0.2s;
        }
        .user-card:hover { border-color: #5865f2; }
        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #5865f2, #4752c4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
        }
        .user-info { flex: 1; }
        .user-name { font-weight: 600; color: #e1e1e6; }
        .user-username { font-size: 0.75rem; color: #8b8ba0; }
        .user-id { font-size: 0.7rem; color: #6b6b76; }
        .action-btn {
          background: #5865f2;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .action-btn:hover { background: #4752c4; }
        .action-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .action-modal {
          background: #14141c;
          border-radius: 1rem;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid #2a2a30;
        }
        .action-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #2a2a30;
        }
        .close-modal { background: none; border: none; color: #8b8ba0; font-size: 1.2rem; cursor: pointer; }
        .action-modal-body { padding: 1.5rem; }
        .action-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #2a2a30;
        }
        .section-title { font-weight: 600; margin-bottom: 0.75rem; color: #a5b4fc; }
        .sub-section-title { font-weight: 500; margin: 0.5rem 0 0.25rem; color: #c7d2fe; font-size: 0.8rem; }
        .punishment-item {
          background: #1a1a22;
          border-radius: 0.5rem;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .punishment-reason { font-size: 0.85rem; }
        .punishment-meta { font-size: 0.7rem; color: #6b6b76; }
        .warn-input {
          width: 100%;
          background: #1a1a22;
          border: 1px solid #2a2a30;
          border-radius: 0.5rem;
          padding: 0.5rem;
          color: #e1e1e6;
          resize: vertical;
          margin-bottom: 0.75rem;
        }
        .action-warn, .action-mute, .action-ban {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        .action-warn { background: #f0b23220; color: #f0b232; border: 1px solid #f0b23240; }
        .action-warn:hover:not(:disabled) { background: #f0b23240; }
        .action-mute { background: #5865f2; color: white; }
        .action-mute:hover:not(:disabled) { background: #4752c4; }
        .action-ban { background: #ed4245; color: white; }
        .action-ban:hover:not(:disabled) { background: #c03538; }
        .mute-options {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .mute-options select {
          background: #1a1a22;
          border: 1px solid #2a2a30;
          border-radius: 0.5rem;
          padding: 0.5rem;
          color: #e1e1e6;
        }
        .ban-info { font-size: 0.7rem; color: #8b8ba0; margin-top: 0.5rem; }
        .action-message { margin-top: 1rem; padding: 0.5rem; border-radius: 0.5rem; text-align: center; background: #1a1a22; }
        .action-loading { text-align: center; padding: 0.5rem; color: #a5b4fc; }
        .loading, .no-users { text-align: center; padding: 3rem; color: #6b6b76; grid-column: 1 / -1; }
      `}</style>
    </div>
  );
}