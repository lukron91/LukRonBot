"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { FiSearch, FiX, FiRefreshCw, FiTrash2, FiUnlock, FiBell, FiAlertTriangle } from 'react-icons/fi';

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
  const [activeTab, setActiveTab] = useState("apply");
  const [punishments, setPunishments] = useState({ warnings: [], mutes: [], bans: [] });
  const [activePunishments, setActivePunishments] = useState({ mute: null, ban: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [muteDuration, setMuteDuration] = useState(60);
  const [warnReason, setWarnReason] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [banReason, setBanReason] = useState("");
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

  const fetchActivePunishments = async (userId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/punishments/${userId}/active`);
      const data = await res.json();
      setActivePunishments({
        mute: data.mute || null,
        ban: data.ban || null
      });
    } catch (err) {
      console.error('Błąd pobierania aktywnych kar:', err);
      setActivePunishments({ mute: null, ban: null });
    }
  };

  const openActionMenu = async (user) => {
    setSelectedUser(user);
    setActionMenu(user.id);
    await Promise.all([
      fetchPunishments(user.id),
      fetchActivePunishments(user.id)
    ]);
    setActionMessage("");
    setWarnReason("");
    setMuteReason("");
    setBanReason("");
    setMuteDuration(60);
    setActiveTab("apply");
  };

  const closeActionMenu = () => {
    setSelectedUser(null);
    setActionMenu(null);
    setPunishments({ warnings: [], mutes: [], bans: [] });
    setActivePunishments({ mute: null, ban: null });
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
        await Promise.all([
          fetchPunishments(selectedUser.id),
          fetchActivePunishments(selectedUser.id)
        ]);
        if (action === 'warn') setWarnReason("");
        if (action === 'mute') setMuteReason("");
        if (action === 'ban') setBanReason("");
      } else {
        setActionMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`❌ Błąd połączenia: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteWarn = async (warnId) => {
    if (!confirm('Czy na pewno chcesz usunąć tego warnu?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/punishments/warn/${warnId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("✅ Warn usunięty");
        await fetchPunishments(selectedUser.id);
      } else {
        setActionMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`❌ Błąd: ${err.message}`);
    }
  };

  const unmuteUser = async () => {
    if (!confirm('Czy na pewno chcesz odciszyć użytkownika?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/moderation/unmute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("✅ Użytkownik odciszony");
        await Promise.all([
          fetchPunishments(selectedUser.id),
          fetchActivePunishments(selectedUser.id)
        ]);
      } else {
        setActionMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`❌ Błąd: ${err.message}`);
    }
  };

  const unbanUser = async () => {
    if (!confirm('Czy na pewno chcesz odbanować użytkownika?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/guilds/${guildId}/moderation/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("✅ Użytkownik odbanowany");
        await Promise.all([
          fetchPunishments(selectedUser.id),
          fetchActivePunishments(selectedUser.id)
        ]);
      } else {
        setActionMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`❌ Błąd: ${err.message}`);
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

            {/* Zakładki */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'apply' ? 'active' : ''}`}
                onClick={() => setActiveTab('apply')}
              >
                Nałóż karę
              </button>
              <button
                className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Aktywne kary
              </button>
              <button
                className={`tab ${activeTab === 'warns' ? 'active' : ''}`}
                onClick={() => setActiveTab('warns')}
              >
                Warny
              </button>
            </div>

            {/* Zakładka: Nałóż karę */}
            {activeTab === 'apply' && (
              <div className="tab-content">
                <div className="action-section">
                  <div className="section-title"><FiAlertTriangle className="icon" /> Dodaj warn</div>
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

                <div className="action-section">
                  <div className="section-title"><FiBell className="icon" /> Wycisz</div>
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

                <div className="action-section">
                  <div className="section-title"><FiAlertTriangle className="icon" /> Zbanuj</div>
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
              </div>
            )}

            {/* Zakładka: Aktywne kary */}
            {activeTab === 'active' && (
              <div className="tab-content">
                {!activePunishments.mute && !activePunishments.ban ? (
                  <div className="no-warnings">Brak aktywnych kar</div>
                ) : (
                  <>
                    {activePunishments.mute && (
                      <div className="active-punishment-item mute">
                        <div className="punishment-info">
                          <div className="punishment-type"><FiBell className="icon" /> Wyciszenie</div>
                          <div className="punishment-reason">{activePunishments.mute.reason}</div>
                          <div className="punishment-meta">
                            Do: {new Date(activePunishments.mute.expiresAt).toLocaleString()}
                          </div>
                        </div>
                        <button onClick={unmuteUser} className="action-button-small unmute">
                          <FiBell /> Odcisz
                        </button>
                      </div>
                    )}
                    {activePunishments.ban && (
                      <div className="active-punishment-item ban">
                        <div className="punishment-info">
                          <div className="punishment-type"><FiAlertTriangle className="icon" /> Ban</div>
                          <div className="punishment-reason">{activePunishments.ban.reason}</div>
                          <div className="punishment-meta">
                            Od: {new Date(activePunishments.ban.date).toLocaleString()}
                          </div>
                        </div>
                        <button onClick={unbanUser} className="action-button-small unban">
                          <FiUnlock /> Odbanuj
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Zakładka: Warny */}
            {activeTab === 'warns' && (
              <div className="tab-content">
                <div className="punishments-list">
                  {punishments.warnings.length === 0 ? (
                    <div className="no-warnings">Brak warnów</div>
                  ) : (
                    <>
                      <div className="subsection-title"><FiAlertTriangle className="icon" /> Warny ({punishments.warnings.length})</div>
                      {punishments.warnings.map((w, idx) => (
                        <div key={idx} className="punishment-item">
                          <div className="punishment-reason">{w.reason}</div>
                          <div className="punishment-meta">
                            <span>{new Date(w.date).toLocaleString()}</span>
                            <button onClick={() => deleteWarn(w.id)} className="delete-btn">
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

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
        .tabs { display: flex; border-bottom: 1px solid #25252d; }
        .tab { flex: 1; padding: 1rem; background: none; border: none; color: #6b6b76; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .tab:hover { color: #fff; background: rgba(88, 101, 242, 0.1); }
        .tab.active { color: #5865f2; border-bottom: 2px solid #5865f2; }
        .tab-content { padding: 1.2rem; }
        .punishments-list { max-height: 300px; overflow-y: auto; }
        .section-title { font-weight: 600; color: #a5b4fc; margin-bottom: 1rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .subsection-title { font-weight: 600; color: #9c9ca7; margin: 1rem 0 0.5rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
        .icon { width: 1.2rem; height: 1.2rem; }
        .no-warnings { color: #6b6b76; text-align: center; padding: 2rem; }
        .active-punishment-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #1e1e26; border-radius: 0.5rem; margin-bottom: 0.75rem; }
        .active-punishment-item.mute { border-left: 3px solid #3b82f6; }
        .active-punishment-item.ban { border-left: 3px solid #ef4444; }
        .punishment-info { flex: 1; }
        .punishment-type { font-weight: 600; color: #fff; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .punishment-reason { color: #9c9ca7; font-size: 0.9rem; margin-bottom: 0.25rem; }
        .punishment-meta { font-size: 0.8rem; color: #6b6b76; }
        .action-button-small { padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
        .action-button-small.unmute { background: #3b82f6; color: #fff; }
        .action-button-small.unban { background: #10b981; color: #fff; }
        .punishment-item { background: #1e1e26; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 0.5rem; }
        .punishment-reason { color: #fff; margin-bottom: 0.25rem; }
        .punishment-meta { font-size: 0.8rem; color: #6b6b76; display: flex; justify-content: space-between; align-items: center; }
        .delete-btn { background: #ef4444; color: #fff; border: none; border-radius: 0.25rem; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; }
        .action-section { margin-bottom: 1.5rem; }
        .action-input, .action-select { width: 100%; padding: 0.75rem; border: 1px solid #25252d; border-radius: 0.5rem; background: #1e1e26; color: #fff; margin-bottom: 0.75rem; font-family: inherit; }
        .action-button { width: 100%; padding: 0.75rem; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; }
        .action-button.warn { background: #f59e0b; color: #000; }
        .action-button.mute { background: #3b82f6; color: #fff; }
        .action-button.ban { background: #ef4444; color: #fff; }
        .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .action-message { padding: 1rem; text-align: center; font-weight: 600; margin: 1rem; border-radius: 0.5rem; }
        .action-message.success { background: #10b981; color: #fff; }
        .action-message.error { background: #ef4444; color: #fff; }
      `}</style>
    </div>
  );
}