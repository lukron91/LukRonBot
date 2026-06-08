"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { FiX, FiRefreshCw, FiTrash2, FiUnlock, FiBell, FiAlertTriangle } from 'react-icons/fi';
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';

export default function UsersPage() {
  const { theme, accentColor } = useTheme();
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
  const [confirmModal, setConfirmModal] = useState(null);
  const fetchAbortRef = useRef(null);

  const fetchMembers = async (showRefresh = false) => {
    if (!guildId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/members', { signal: controller.signal });
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
      setFilteredUsers(usersArray.filter(user =>
        user.username?.toLowerCase().includes(term) ||
        user.displayName?.toLowerCase().includes(term)
      ));
    }
  }, [searchTerm, users]);

  const fetchPunishments = async (userId) => {
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + userId);
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
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + userId + '/active');
      const data = await res.json();
      setActivePunishments({ mute: data.mute || null, ban: data.ban || null });
    } catch (err) {
      console.error('Błąd pobierania aktywnych kar:', err);
      setActivePunishments({ mute: null, ban: null });
    }
  };

  const openActionMenu = async (user) => {
    setSelectedUser(user);
    setActionMenu(user.id);
    await Promise.all([fetchPunishments(user.id), fetchActivePunishments(user.id)]);
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
        if (!warnReason.trim()) { setActionMessage("❌ Podaj powód warnu"); setActionLoading(false); return; }
        body = { userId: selectedUser.id, reason: warnReason, moderatorId: 'panel' };
        break;
      case 'mute':
        if (!muteReason.trim()) { setActionMessage("❌ Podaj powód wyciszenia"); setActionLoading(false); return; }
        body = { userId: selectedUser.id, duration: muteDuration, reason: muteReason, moderatorId: 'panel' };
        break;
      case 'ban':
        if (!banReason.trim()) { setActionMessage("❌ Podaj powód bana"); setActionLoading(false); return; }
        body = { userId: selectedUser.id, reason: banReason, moderatorId: 'panel' };
        break;
      default: return;
    }
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/moderation/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('✅ ' + (action === 'mute' ? 'Wyciszono' : action === 'ban' ? 'Zbanowano' : 'Dodano warn') + ' pomyślnie');
        await Promise.all([fetchPunishments(selectedUser.id), fetchActivePunishments(selectedUser.id)]);
        if (action === 'warn') setWarnReason("");
        if (action === 'mute') setMuteReason("");
        if (action === 'ban') setBanReason("");
      } else {
        setActionMessage('❌ Błąd: ' + data.error);
      }
    } catch (err) {
      setActionMessage('❌ Błąd połączenia: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteWarn = (warnId) => {
    setConfirmModal({
      label: 'Czy na pewno chcesz usunąć tego warna?',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/proxy/api/guilds/' + guildId + '/punishments/warn/' + warnId, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { setActionMessage("✅ Warn usunięty"); await fetchPunishments(selectedUser.id); }
          else setActionMessage('❌ Błąd: ' + data.error);
        } catch (err) { setActionMessage('❌ Błąd: ' + err.message); }
      }
    });
  };

  const unmuteUser = () => {
    setConfirmModal({
      label: 'Czy na pewno chcesz odciszyć użytkownika?',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/proxy/api/guilds/' + guildId + '/moderation/unmute', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUser.id })
          });
          const data = await res.json();
          if (data.success) { setActionMessage("✅ Użytkownik odciszony"); await Promise.all([fetchPunishments(selectedUser.id), fetchActivePunishments(selectedUser.id)]); }
          else setActionMessage('❌ Błąd: ' + data.error);
        } catch (err) { setActionMessage('❌ Błąd: ' + err.message); }
      }
    });
  };

  const unbanUser = () => {
    setConfirmModal({
      label: 'Czy na pewno chcesz odbanować użytkownika?',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/proxy/api/guilds/' + guildId + '/moderation/unban', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUser.id })
          });
          const data = await res.json();
          if (data.success) { setActionMessage("✅ Użytkownik odbanowany"); await Promise.all([fetchPunishments(selectedUser.id), fetchActivePunishments(selectedUser.id)]); }
          else setActionMessage('❌ Błąd: ' + data.error);
        } catch (err) { setActionMessage('❌ Błąd: ' + err.message); }
      }
    });
  };

  if (!guildId) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Wybierz serwer z lewego menu.</div>;
  }

  return (
    <div className="users-page">

      {/* Modal potwierdzenia — zamiast window.confirm */}
      {confirmModal && (
        <Modal isOpen={true} onClose={() => setConfirmModal(null)} title="Potwierdzenie" width="400px">
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-color)' }}>{confirmModal.label}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-base btn-standard" onClick={() => setConfirmModal(null)}>Anuluj</button>
            <button className="btn-base btn-danger" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Potwierdź</button>
          </div>
        </Modal>
      )}

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
          <button onClick={() => fetchMembers(true)} disabled={loading || refreshing} className="btn-base btn-standard">
            <FiRefreshCw className={refreshing ? 'spinning' : ''} /> Odśwież
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
                  {user.avatar
                    ? <img src={'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png'} alt="" />
                    : <div className="avatar-placeholder">{user.username?.charAt(0).toUpperCase()}</div>
                  }
                </div>
                <div className="user-info">
                  <div className="user-name">{user.displayName || user.username}</div>
                  <div className="user-username">@{user.username}</div>
                  <div className="user-id">ID: {user.id}</div>
                </div>
                <button onClick={() => openActionMenu(user)} className="btn-base btn-standard">Akcje</button>
              </div>
            ))
          )}
        </div>
      )}

      {actionMenu && selectedUser && (
        <Modal
          isOpen={!!actionMenu}
          onClose={closeActionMenu}
          title={'Akcje dla ' + (selectedUser?.displayName || selectedUser?.username || '')}
          width="650px"
        >
          <div className="tabs">
            <button
              className={'tab' + (activeTab === 'apply' ? ' active' : '')}
              onClick={() => setActiveTab('apply')}
              style={{ borderBottomColor: activeTab === 'apply' ? accentColor : 'transparent' }}
            >
              Nałóż karę
            </button>
            <button
              className={'tab' + (activeTab === 'active' ? ' active' : '')}
              onClick={() => setActiveTab('active')}
              style={{ borderBottomColor: activeTab === 'active' ? accentColor : 'transparent' }}
            >
              Aktywne kary
            </button>
            <button
              className={'tab' + (activeTab === 'warns' ? ' active' : '')}
              onClick={() => setActiveTab('warns')}
              style={{ borderBottomColor: activeTab === 'warns' ? accentColor : 'transparent' }}
            >
              Warny
            </button>
          </div>

          {activeTab === 'apply' && (
            <div className="tab-content">
              <div className="action-section">
                <div className="section-title"><FiAlertTriangle /> Dodaj warn</div>
                <textarea placeholder="Powód warnu..." value={warnReason} onChange={(e) => setWarnReason(e.target.value)} className="action-input" rows={2} />
                <button onClick={() => executeAction('warn')} disabled={actionLoading || !warnReason.trim()} className="action-button warn">
                  {actionLoading ? 'Dodawanie...' : 'Dodaj warn'}
                </button>
              </div>
              <div className="action-section">
                <div className="section-title"><FiBell /> Wycisz</div>
                <select value={muteDuration} onChange={(e) => setMuteDuration(Number(e.target.value))} className="action-select">
                  <option value={1}>1 minuta</option>
                  <option value={5}>5 minut</option>
                  <option value={10}>10 minut</option>
                  <option value={30}>30 minut</option>
                  <option value={60}>1 godzina</option>
                  <option value={1440}>24 godziny</option>
                </select>
                <textarea placeholder="Powód wyciszenia..." value={muteReason} onChange={(e) => setMuteReason(e.target.value)} className="action-input" rows={2} />
                <button onClick={() => executeAction('mute')} disabled={actionLoading || !muteReason.trim()} className="action-button mute">
                  {actionLoading ? 'Wyciszanie...' : 'Wycisz'}
                </button>
              </div>
              <div className="action-section">
                <div className="section-title"><FiAlertTriangle /> Zbanuj</div>
                <textarea placeholder="Powód bana..." value={banReason} onChange={(e) => setBanReason(e.target.value)} className="action-input" rows={2} />
                <button onClick={() => executeAction('ban')} disabled={actionLoading || !banReason.trim()} className="action-button ban">
                  {actionLoading ? 'Banowanie...' : 'Zbanuj'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="tab-content">
              {!activePunishments.mute && !activePunishments.ban ? (
                <div className="no-warnings">Brak aktywnych kar</div>
              ) : (
                <>
                  {activePunishments.mute && (
                    <div className="active-punishment-item mute">
                      <div className="punishment-info">
                        <div className="punishment-type"><FiBell /> Wyciszenie</div>
                        <div className="punishment-reason">{activePunishments.mute.reason}</div>
                        <div className="punishment-meta">Do: {new Date(activePunishments.mute.expiresAt).toLocaleString()}</div>
                      </div>
                      <button onClick={unmuteUser} className="btn-base btn-success" style={{ padding: '0.4rem 0.8rem', minWidth: 'auto', fontSize: '0.8rem' }}>
                        <FiBell /> Odcisz
                      </button>
                    </div>
                  )}
                  {activePunishments.ban && (
                    <div className="active-punishment-item ban">
                      <div className="punishment-info">
                        <div className="punishment-type"><FiAlertTriangle /> Ban</div>
                        <div className="punishment-reason">{activePunishments.ban.reason}</div>
                        <div className="punishment-meta">Od: {new Date(activePunishments.ban.date).toLocaleString()}</div>
                      </div>
                      <button onClick={unbanUser} className="btn-base btn-standard" style={{ padding: '0.4rem 0.8rem', minWidth: 'auto', fontSize: '0.8rem' }}>
                        <FiUnlock /> Odbanuj
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'warns' && (
            <div className="tab-content">
              <div className="punishments-list">
                {punishments.warnings.length === 0 ? (
                  <div className="no-warnings">Brak warnów</div>
                ) : (
                  <>
                    <div className="subsection-title"><FiAlertTriangle /> Warny ({punishments.warnings.length})</div>
                    {punishments.warnings.map((w, idx) => (
                      <div key={idx} className="punishment-item">
                        <div className="punishment-reason">{w.reason}</div>
                        <div className="punishment-meta">
                          <span>{new Date(w.date).toLocaleString()}</span>
                          <button onClick={() => deleteWarn(w.id)} className="btn-base btn-danger" style={{ padding: '0.3rem 0.6rem', minWidth: 'auto' }}>
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
            <div className={'action-message ' + (actionMessage.startsWith('✅') ? 'success' : 'error')}>
              {actionMessage}
            </div>
          )}
        </Modal>
      )}

      <style jsx>{`
        .users-page { padding: 1.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .page-header h1 { font-size: 1.5rem; color: var(--text-color); margin: 0; }
        .header-actions { display: flex; align-items: center; gap: 0.5rem; }
        .search-input { padding: 0.5rem 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--bg-color); color: var(--text-color); width: 250px; }
        .clear-search { cursor: pointer; color: var(--text-muted); }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .user-card { background: rgba(var(--surface-rgb), var(--surface-opacity)); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1rem; display: flex; align-items: center; gap: 1rem; transition: all 0.2s; }
        .user-card:hover { border-color: var(--accent-color); transform: translateY(-2px); }
        .user-avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-placeholder { width: 100%; height: 100%; background: var(--accent-color); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: white; }
        .user-info { flex: 1; min-width: 0; }
        .user-name { font-weight: 600; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-username { font-size: 0.85rem; color: var(--text-muted); }
        .user-id { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
        .loading, .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1; }
        .tabs { display: flex; border-bottom: 1px solid var(--border-color); }
        .tab { flex: 1; padding: 1rem; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .tab:hover { color: var(--text-color); }
        .tab.active { color: var(--text-color); }
        .tab-content { padding: 1.2rem; }
        .punishments-list { max-height: 300px; overflow-y: auto; }
        .section-title { font-weight: 600; color: var(--accent-color); margin-bottom: 1rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .subsection-title { font-weight: 600; color: var(--text-muted); margin: 1rem 0 0.5rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
        .no-warnings { color: var(--text-muted); text-align: center; padding: 2rem; }
        .active-punishment-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(var(--surface-rgb), 0.5); border-radius: var(--border-radius); margin-bottom: 0.75rem; }
        .active-punishment-item.mute { border-left: 3px solid #3b82f6; }
        .active-punishment-item.ban { border-left: 3px solid #ef4444; }
        .punishment-info { flex: 1; }
        .punishment-type { font-weight: 600; color: var(--text-color); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .punishment-reason { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.25rem; }
        .punishment-meta { font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; }
        .punishment-item { background: rgba(var(--surface-rgb), 0.5); border-radius: var(--border-radius); padding: 0.75rem; margin-bottom: 0.5rem; }
        .action-section { margin-bottom: 1.5rem; }
        .action-input, .action-select { width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--bg-color); color: var(--text-color); margin-bottom: 0.75rem; font-family: inherit; }
        .action-button { width: 100%; padding: 0.75rem; border: none; border-radius: var(--border-radius); font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; }
        .action-button.warn { background: #f59e0b; color: #000; }
        .action-button.mute { background: #3b82f6; color: #fff; }
        .action-button.ban { background: #ef4444; color: #fff; }
        .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .action-message { padding: 1rem; text-align: center; font-weight: 600; margin: 1rem; border-radius: var(--border-radius); }
        .action-message.success { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981; }
        .action-message.error { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid #ef4444; }
      `}</style>
    </div>
  );
}
