"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiX, FiAlertTriangle, FiBellOff, FiLock, FiRefreshCw, FiTrash2 } from 'react-icons/fi';

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
  const [banMethod, setBanMethod] = useState("discord");
  const [banRoleId, setBanRoleId] = useState("");
  const [roles, setRoles] = useState([]);
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
      setPunishments({
        warnings: Array.isArray(data?.warnings) ? data.warnings : [],
        mutes: Array.isArray(data?.mutes) ? data.mutes : [],
        bans: Array.isArray(data?.bans) ? data.bans : []
      });
    } catch (err) {
      console.error(err);
      setPunishments({ warnings: [], mutes: [], bans: [] });
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/roles`);
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/config`);
      const data = await res.json();
      setBanMethod(data.banMethod || 'discord');
      setBanRoleId(data.banRoleId || '');
    } catch (err) {
      console.error(err);
    }
  };

  const openActionMenu = async (user) => {
    setSelectedUser(user);
    setActionMenu(user.id);
    await Promise.all([fetchPunishments(user.id), fetchRoles(), fetchConfig()]);
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
        body = { 
          userId: selectedUser.id, 
          reason: banReason, 
          moderatorId: 'panel',
          banType: banMethod,
          roleId: banMethod === 'role' ? banRoleId : null
        };
        break;
      default: return;
    }
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/moderation/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✅ ${action === 'mute' ? 'Wyciszono' : action === 'ban' ? 'Zbanowano' : 'Dodano warn'} pomyślnie`);
        await fetchPunishments(selectedUser.id);
        if (action === 'warn') setWarnReason("");
        if (action === 'mute') setMuteReason("");
        if (action === 'ban') setBanReason("");
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

  const deletePunishment = async (type, punishmentId) => {
    if (!confirm('Czy na pewno chcesz usunąć tę karę?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/punishments/${type}/${punishmentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("✅ Kara usunięta");
        await fetchPunishments(selectedUser.id);
      } else {
        setActionMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`❌ Błąd: ${err.message}`);
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banMethod, banRoleId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("✅ Konfiguracja zapisana");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!guildId) {
    return <div className="text-center" style={{ marginTop: "3rem", color: "#6b6b76" }}>Wybierz serwer z lewego menu.</div>;
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Lista użytkowników</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Szukaj użytkownika..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && <FiX className="clear-search" onClick={() => setSearchTerm("")} />}
          <button onClick={() => fetchMembers(true)} disabled={loading || refreshing} className="refresh-btn">
            <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            Odśwież
          </button>
        </div>
      </div>

      {loading && !refreshing ? (
        <div className="loading">Ładowanie użytkowników...</div>
      ) : (
        <div className="users-grid">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">Brak użytkowników spełniających kryteria.</div>
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
                <button onClick={() => openActionMenu(user)} className="action-btn">Akcje</button>
              </div>
            ))
          )}
        </div>
      )}

      {actionMenu && selectedUser && (
        <div className="modal-overlay" onClick={closeActionMenu}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Akcje dla {selectedUser.displayName || selectedUser.username}</h3>
              <button onClick={closeActionMenu} className="close-btn"><FiX /></button>
            </div>

            {/* Historia kar */}
            <div className="action-section">
              <div className="section-title"> Historia kar</div>
              {!punishments || (punishments.warnings.length === 0 && punishments.mutes.length === 0 && punishments.bans.length === 0) ? (
                <div className="no-warnings">Brak kar</div>
              ) : (
                <>
                  {punishments.warnings.length > 0 && (
                    <>
                      <div className="subsection-title">️ Warny ({punishments.warnings.length})</div>
                      {punishments.warnings.map((w, idx) => (
                        <div key={idx} className="punishment-item">
                          <div className="punishment-reason">{w.reason}</div>
                          <div className="punishment-meta">
                            {new Date(w.date).toLocaleString()}
                            <button onClick={() => deletePunishment('warn', w.id)} className="delete-btn">
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {punishments.mutes.length > 0 && (
                    <>
                      <div className="subsection-title">🔇 Wyciszenia</div>
                      {punishments.mutes.map((m, idx) => (
                        <div key={idx} className="punishment-item">
                          <div className="punishment-reason">{m.reason}</div>
                          <div className="punishment-meta">
                            {Math.floor(m.duration / 60)} min • {new Date(m.date).toLocaleString()}
                            <button onClick={() => deletePunishment('mute', m.id)} className="delete-btn">
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {punishments.bans.length > 0 && (
                    <>
                      <div className="subsection-title"> Bany</div>
                      {punishments.bans.map((b, idx) => (
                        <div key={idx} className="punishment-item">
                          <div className="punishment-reason">{b.reason}</div>
                          <div className="punishment-meta">
                            {b.type === 'role' ? 'Ban przez rolę' : 'Discord Ban'} • {new Date(b.date).toLocaleString()}
                            <button onClick={() => deletePunishment('ban', b.id)} className="delete-btn">
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Konfiguracja banowania */}
            <div className="action-section">
              <div className="section-title">⚙️ Konfiguracja banowania</div>
              <div className="config-row">
                <label>
                  <input
                    type="radio"
                    name="banMethod"
                    value="discord"
                    checked={banMethod === 'discord'}
                    onChange={(e) => setBanMethod(e.target.value)}
                  />
                  Systemowy ban Discord
                </label>
                <label>
                  <input
                    type="radio"
                    name="banMethod"
                    value="role"
                    checked={banMethod === 'role'}
                    onChange={(e) => setBanMethod(e.target.value)}
                  />
                  Ban przez rolę
                </label>
              </div>
              {banMethod === 'role' && (
                <select
                  value={banRoleId}
                  onChange={(e) => setBanRoleId(e.target.value)}
                  className="action-select"
                >
                  <option value="">Wybierz rolę...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              )}
              <button onClick={saveConfig} className="config-save-btn">Zapisz konfigurację</button>
            </div>

            {/* Dodawanie warnu */}
            <div className="action-section">
              <div className="section-title">➕ Dodaj warn</div>
              <textarea
                placeholder="Powód warnu..."
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                className="action-input"
                rows={2}
              />
              <button onClick={() => executeAction('warn')} disabled={actionLoading || !warnReason.trim()} className="action-button warn">
                {actionLoading ? 'Dodawanie...' : 'Dodaj warn'}
              </button>
            </div>

            {/* Wyciszenie */}
            <div className="action-section">
              <div className="section-title"> Wycisz</div>
              <select value={muteDuration} onChange={(e) => setMuteDuration(Number(e.target.value))} className="action-select">
                <option value={1}>1 minuta</option>
                <option value={5}>5 minut</option>
                <option value={10}>10 minut</option>
                <option value={30}>30 minut</option>
                <option value={60}>1 godzina</option>
                <option value={1440}>24 godziny</option>
              </select>
              <textarea
                placeholder="Powód wyciszenia..."
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                className="action-input"
                rows={2}
              />
              <button onClick={() => executeAction('mute')} disabled={actionLoading || !muteReason.trim()} className="action-button mute">
                {actionLoading ? 'Wyciszanie...' : 'Wycisz'}
              </button>
            </div>

            {/* Ban */}
            <div className="action-section">
              <div className="section-title"> Zbanuj</div>
              <textarea
                placeholder="Powód bana..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="action-input"
                rows={2}
              />
              <button onClick={() => executeAction('ban')} disabled={actionLoading || !banReason.trim()} className="action-button ban">
                {actionLoading ? 'Banowanie...' : 'Zbanuj'}
              </button>
            </div>

            {actionMessage && (
              <div className={`action-message ${actionMessage.startsWith('✅') ? 'success' : 'error'}`}>
                {actionMessage}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .users-page { padding: 1.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .page-header h1 { font-size: 1.5rem; color: #fff; margin: 0; }
        .header-actions { display: flex; align-items: center; gap: 0.5rem; }
        .search-input { padding: 0.5rem 1rem; border: 1px solid #25252d; border-radius: 0.5rem; background: #14141c; color: #fff; width: 250px; }
        .clear-search { cursor: pointer; color: #6b6b76; }
        .refresh-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #5865f2; color: #fff; border: none; border-radius: 0.5rem; cursor: pointer; }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .user-card { background: #14141c; border: 1px solid #25252d; border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 1rem; transition: all 0.2s; }
        .user-card:hover { border-color: #5865f2; transform: translateY(-2px); }
        .user-avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #5865f2, #4752c4); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: white; }
        .user-info { flex: 1; min-width: 0; }
        .user-name { font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-username { font-size: 0.85rem; color: #9c9ca7; }
        .user-id { font-size: 0.75rem; color: #6b6b76; margin-top: 0.25rem; }
        .action-btn { padding: 0.5rem 1rem; background: #5865f2; color: #fff; border: none; border-radius: 0.5rem; cursor: pointer; flex-shrink: 0; }
        .loading, .empty-state { text-align: center; padding: 3rem; color: #6b6b76; grid-column: 1 / -1; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
        .modal-content { background: #14141c; border: 1px solid #25252d; border-radius: 1rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem; border-bottom: 1px solid #25252d; }
        .modal-header h3 { margin: 0; color: #fff; }
        .close-btn { background: none; border: none; color: #6b6b76; font-size: 1.5rem; cursor: pointer; }
        .action-section { padding: 1.2rem; border-bottom: 1px solid #25252d; }
        .section-title { font-weight: 600; color: #a5b4fc; margin-bottom: 1rem; font-size: 1rem; }
        .subsection-title { font-weight: 600; color: #9c9ca7; margin: 1rem 0 0.5rem; font-size: 0.9rem; }
        .no-warnings { color: #6b6b76; text-align: center; padding: 1rem; }
        .punishment-item { background: #1e1e26; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 0.5rem; }
        .punishment-reason { color: #fff; margin-bottom: 0.25rem; }
        .punishment-meta { font-size: 0.8rem; color: #6b6b76; display: flex; justify-content: space-between; align-items: center; }
        .delete-btn { background: #ef4444; color: #fff; border: none; border-radius: 0.25rem; padding: 0.25rem 0.5rem; cursor: pointer; }
        .config-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .config-row label { display: flex; align-items: center; gap: 0.5rem; color: #fff; }
        .config-save-btn { width: 100%; padding: 0.75rem; background: #10b981; color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
        .action-input, .action-select { width: 100%; padding: 0.75rem; border: 1px solid #25252d; border-radius: 0.5rem; background: #1e1e26; color: #fff; margin-bottom: 0.75rem; font-family: inherit; }
        .action-button { width: 100%; padding: 0.75rem; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; }
        .action-button.warn { background: #f59e0b; color: #000; }
        .action-button.mute { background: #3b82f6; color: #fff; }
        .action-button.ban { background: #ef4444; color: #fff; }
        .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .action-message { padding: 1rem; text-align: center; font-weight: 600; }
        .action-message.success { background: #10b981; color: #fff; }
        .action-message.error { background: #ef4444; color: #fff; }
      `}</style>
    </div>
  );
}