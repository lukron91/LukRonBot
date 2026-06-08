"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';
import {
  FiShield, FiPlus, FiEdit2, FiTrash2, FiCopy, FiRefreshCw,
  FiUsers, FiChevronUp, FiChevronDown, FiCheck, FiAlertTriangle,
  FiWifi, FiWifiOff
} from 'react-icons/fi';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { key: 'Administrator',         label: 'Administrator' },
  { key: 'ManageGuild',           label: 'Zarządzaj serwerem' },
  { key: 'ManageRoles',           label: 'Zarządzaj rolami' },
  { key: 'ManageChannels',        label: 'Zarządzaj kanałami' },
  { key: 'KickMembers',           label: 'Wyrzucaj członków' },
  { key: 'BanMembers',            label: 'Banuj członków' },
  { key: 'MuteMembers',           label: 'Wyciszaj członków' },
  { key: 'ManageMessages',        label: 'Zarządzaj wiadomościami' },
  { key: 'SendMessages',          label: 'Wysyłaj wiadomości' },
  { key: 'ReadMessageHistory',    label: 'Czytaj historię' },
  { key: 'ViewChannel',           label: 'Wyświetlaj kanały' },
  { key: 'Connect',               label: 'Połącz (voice)' },
  { key: 'Speak',                 label: 'Mów (voice)' },
  { key: 'AttachFiles',           label: 'Załączaj pliki' },
  { key: 'EmbedLinks',            label: 'Osadzaj linki' },
  { key: 'AddReactions',          label: 'Dodawaj reakcje' },
  { key: 'UseExternalEmojis',     label: 'Zewnętrzne emoji' },
  { key: 'ChangeNickname',        label: 'Zmień pseudonim' },
  { key: 'ManageNicknames',       label: 'Zarządzaj pseudonimami' },
];

function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
function intToHex(int) {
  if (!int) return '#000000';
  return '#' + int.toString(16).padStart(6, '0');
}

// ─── Komponent główny ────────────────────────────────────────────────────────

export default function RolesPage() {
  const { accentColor } = useTheme();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");

  // Stan ról
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connected' | 'disconnected' | 'unsupported'

  // Wybrany modal
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete' | 'members' | 'assign'

  // Edytowana/tworzona rola
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', color: '#000000', hoist: false, mentionable: false, permissions: [] });

  // Członkowie roli
  const [roleMembers, setRoleMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Assign — nadawanie roli userowi
  const [assignSearch, setAssignSearch] = useState('');
  const [assignUsers, setAssignUsers] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Akcja feedback
  const [actionMsg, setActionMsg] = useState(null); // { text, type }
  const wsRef = useRef(null);

  // ─── Fetch ról ──────────────────────────────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/roles/detailed');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setRoles(Array.isArray(data) ? data : (data.roles || []));
        setError(null);
      } catch { throw new Error('Nieprawidłowa odpowiedź serwera'); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  // ─── WebSocket ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!guildId) return;

    // Próba połączenia WebSocket — jeśli bot nie ma WS, fallback do polling
    const wsUrl = 'ws://localhost:3001/ws?guildId=' + guildId;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => {
        setWsStatus('disconnected');
        // Fallback: polling co 10s gdy WS niedostępny
        startPolling();
      };
      ws.onerror = () => {
        setWsStatus('unsupported');
        ws.close();
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Eventy dotyczące ról — odświeżamy listę
          if (['roleCreate', 'roleUpdate', 'roleDelete', 'guildMemberUpdate'].includes(msg.type)) {
            fetchRoles();
          }
        } catch {}
      };
    } catch {
      setWsStatus('unsupported');
      startPolling();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      stopPolling();
    };
  }, [guildId]);

  // ─── Polling fallback ────────────────────────────────────────────────────────

  const pollRef = useRef(null);
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchRoles, 10000);
  };
  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ─── Akcje ──────────────────────────────────────────────────────────────────

  const showMsg = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const safeFetch = async (url, options = {}) => {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data;
  };

  const handleCreateRole = async () => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleForm.name || 'Nowa rola',
          color: hexToInt(roleForm.color),
          hoist: roleForm.hoist,
          mentionable: roleForm.mentionable,
          permissions: roleForm.permissions,
        })
      });
      showMsg('✅ Rola utworzona');
      setModal(null);
      fetchRoles();
    } catch (err) { showMsg('❌ ' + err.message, 'error'); }
  };

  const handleEditRole = async () => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + editingRole.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleForm.name,
          color: hexToInt(roleForm.color),
          hoist: roleForm.hoist,
          mentionable: roleForm.mentionable,
          permissions: roleForm.permissions,
        })
      });
      showMsg('✅ Rola zaktualizowana');
      setModal(null);
      fetchRoles();
    } catch (err) { showMsg('❌ ' + err.message, 'error'); }
  };

  const handleDeleteRole = async () => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + editingRole.id, { method: 'DELETE' });
      showMsg('✅ Rola usunięta');
      setModal(null);
      fetchRoles();
    } catch (err) { showMsg('❌ ' + err.message, 'error'); }
  };

  const handleCopyRole = async (role) => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + role.id + '/copy', { method: 'POST' });
      showMsg('✅ Skopiowano rolę "' + role.name + '"');
      fetchRoles();
    } catch (err) { showMsg('❌ ' + err.message, 'error'); }
  };

  const handleMoveRole = async (role, direction) => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + role.id + '/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });
      fetchRoles();
    } catch (err) { showMsg('❌ ' + err.message, 'error'); }
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      color: intToHex(role.color),
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions || [],
    });
    setModal('edit');
  };

  const openCreate = () => {
    setEditingRole(null);
    setRoleForm({ name: '', color: '#000000', hoist: false, mentionable: false, permissions: [] });
    setModal('create');
  };

  const openMembers = async (role) => {
    setEditingRole(role);
    setModal('members');
    setMembersLoading(true);
    try {
      const data = await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + role.id + '/members');
      setRoleMembers(data.members || []);
    } catch { setRoleMembers([]); }
    finally { setMembersLoading(false); }
  };

  const openAssign = async (role) => {
    setEditingRole(role);
    setAssignSearch('');
    setAssignUsers([]);
    setModal('assign');
    // Załaduj wszystkich członków
    setAssignLoading(true);
    try {
      const data = await safeFetch('/api/proxy/api/guilds/' + guildId + '/members');
      const members = Array.isArray(data) ? data : (data.members || data.users || []);
      setAssignUsers(members);
    } catch { setAssignUsers([]); }
    finally { setAssignLoading(false); }
  };

  const handleToggleRole = async (userId, hasRole) => {
    try {
      const endpoint = hasRole ? 'remove' : 'add';
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + editingRole.id + '/members/' + userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: endpoint })
      });
      // Odśwież listę users z aktualnym stanem roli
      const data = await safeFetch('/api/proxy/api/guilds/' + guildId + '/members');
      const members = Array.isArray(data) ? data : (data.members || data.users || []);
      setAssignUsers(members);
      showMsg(hasRole ? '✅ Rola odebrana' : '✅ Rola nadana');
    } catch (err) { showMsg('❌ ' + err.message, 'error'); }
  };

  const togglePermission = (perm) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!guildId) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Wybierz serwer z lewego menu.
    </div>
  );

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Ładowanie ról...
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
      <div className="roles-error">
        <div className="roles-error-title"><FiAlertTriangle /> Brak połączenia z serwerem</div>
        <p>{error}</p>
        <button className="btn-base btn-standard" onClick={fetchRoles}><FiRefreshCw /> Spróbuj ponownie</button>
      </div>
    </div>
  );

  const filteredAssignUsers = assignUsers.filter(u =>
    u.username?.toLowerCase().includes(assignSearch.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  return (
    <div className="roles-page">

      {/* Toast */}
      {actionMsg && (
        <div className={'roles-toast ' + actionMsg.type}>
          {actionMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="roles-header">
        <div className="roles-header-left">
          <h1><FiShield /> Zarządzanie rolami</h1>
          <p>Lista ról serwera — {roles.length} ról</p>
        </div>
        <div className="btn-row">
          <div className={'ws-badge ' + wsStatus} title={wsStatus === 'connected' ? 'Real-time aktywny' : wsStatus === 'unsupported' ? 'Real-time niedostępny (polling)' : 'Brak połączenia real-time'}>
            {wsStatus === 'connected' ? <><FiWifi /> Real-time</> : <><FiWifiOff /> Polling</>}
          </div>
          <button className="btn-base btn-standard" onClick={fetchRoles}><FiRefreshCw /> Odśwież</button>
          <button className="btn-base btn-success" onClick={openCreate}><FiPlus /> Nowa rola</button>
        </div>
      </div>

      {/* Lista ról */}
      <div className="roles-list">
        {roles.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Brak ról na serwerze.
          </div>
        ) : (
          roles.map((role, idx) => (
            <div key={role.id} className="role-row">
              {/* Kolor + nazwa */}
              <div className="role-color-dot" style={{ background: role.color ? intToHex(role.color) : '#99aab5' }} />
              <div className="role-info">
                <span className="role-name">{role.name}</span>
                <span className="role-meta">
                  {role.memberCount !== undefined && <><FiUsers /> {role.memberCount} · </>}
                  {role.hoist && <span className="role-tag">widoczna</span>}
                  {role.mentionable && <span className="role-tag">wzmiankowana</span>}
                </span>
              </div>

              {/* Akcje */}
              <div className="role-actions btn-row">
                <button className="btn-base btn-standard" style={{ minWidth: 'auto' }} title="Przesuń wyżej" onClick={() => handleMoveRole(role, 'up')}><FiChevronUp /></button>
                <button className="btn-base btn-standard" style={{ minWidth: 'auto' }} title="Przesuń niżej" onClick={() => handleMoveRole(role, 'down')}><FiChevronDown /></button>
                <button className="btn-base btn-standard" style={{ minWidth: 'auto' }} title="Członkowie" onClick={() => openMembers(role)}><FiUsers /></button>
                <button className="btn-base btn-standard" style={{ minWidth: 'auto' }} title="Nadaj/odbierz rolę" onClick={() => openAssign(role)}><FiCheck /></button>
                <button className="btn-base btn-standard" style={{ minWidth: 'auto' }} title="Kopiuj rolę" onClick={() => handleCopyRole(role)}><FiCopy /></button>
                <button className="btn-base btn-standard" style={{ minWidth: 'auto' }} title="Edytuj" onClick={() => openEdit(role)}><FiEdit2 /></button>
                <button className="btn-base btn-danger"   style={{ minWidth: 'auto' }} title="Usuń" onClick={() => { setEditingRole(role); setModal('delete'); }}><FiTrash2 /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal: Utwórz / Edytuj ── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setModal(null)}
          title={modal === 'create' ? 'Nowa rola' : 'Edytuj rolę: ' + editingRole?.name}
          width="560px"
        >
          <div className="modal-tab-content">
            <div className="modal-section">
              <div className="modal-section-title">Podstawowe</div>
              <input
                className="modal-input"
                placeholder="Nazwa roli"
                value={roleForm.name}
                onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <label style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>Kolor:</label>
                <input
                  type="color"
                  value={roleForm.color}
                  onChange={e => setRoleForm(p => ({ ...p, color: e.target.value }))}
                  style={{ width: '48px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{roleForm.color}</span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={roleForm.hoist} onChange={e => setRoleForm(p => ({ ...p, hoist: e.target.checked }))} style={{ display: 'none' }} />
                  <span className="slider" />
                  Wyświetlaj oddzielnie
                </label>
                <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={roleForm.mentionable} onChange={e => setRoleForm(p => ({ ...p, mentionable: e.target.checked }))} style={{ display: 'none' }} />
                  <span className="slider" />
                  Wzmiankowana
                </label>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">Uprawnienia</div>
              <div className="permissions-grid">
                {PERMISSIONS.map(perm => (
                  <label key={perm.key} className="perm-item" onClick={() => togglePermission(perm.key)}>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={roleForm.permissions.includes(perm.key)} readOnly />
                      <span className="slider" />
                    </label>
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="btn-row-end">
              <button className="btn-base btn-standard" onClick={() => setModal(null)}>Anuluj</button>
              <button className="btn-base btn-success" onClick={modal === 'create' ? handleCreateRole : handleEditRole}>
                {modal === 'create' ? 'Utwórz' : 'Zapisz'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Usuń ── */}
      {modal === 'delete' && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Usuń rolę" width="400px">
          <div className="modal-tab-content">
            <p style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>
              Czy na pewno chcesz usunąć rolę <strong style={{ color: 'var(--accent-color)' }}>{editingRole?.name}</strong>?
              Tej operacji nie można cofnąć.
            </p>
            <div className="btn-row-end">
              <button className="btn-base btn-standard" onClick={() => setModal(null)}>Anuluj</button>
              <button className="btn-base btn-danger" onClick={handleDeleteRole}>Usuń</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Członkowie roli ── */}
      {modal === 'members' && (
        <Modal isOpen={true} onClose={() => setModal(null)} title={'Członkowie: ' + editingRole?.name} width="480px">
          <div className="modal-tab-content">
            {membersLoading ? (
              <div className="modal-empty">Ładowanie...</div>
            ) : roleMembers.length === 0 ? (
              <div className="modal-empty">Nikt nie ma tej roli.</div>
            ) : (
              <div className="members-list">
                {roleMembers.map(m => (
                  <div key={m.id} className="member-row">
                    <div className="member-avatar">
                      {m.avatar
                        ? <img src={'https://cdn.discordapp.com/avatars/' + m.id + '/' + m.avatar + '.png'} alt="" />
                        : <div className="member-avatar-placeholder">{m.username?.charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{m.displayName || m.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{m.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: Nadaj / odbierz rolę ── */}
      {modal === 'assign' && (
        <Modal isOpen={true} onClose={() => setModal(null)} title={'Nadaj/odbierz: ' + editingRole?.name} width="520px">
          <div className="modal-tab-content">
            <input
              className="modal-input"
              placeholder="Szukaj użytkownika..."
              value={assignSearch}
              onChange={e => setAssignSearch(e.target.value)}
            />
            {assignLoading ? (
              <div className="modal-empty">Ładowanie użytkowników...</div>
            ) : filteredAssignUsers.length === 0 ? (
              <div className="modal-empty">Brak wyników.</div>
            ) : (
              <div className="members-list">
                {filteredAssignUsers.map(u => {
                  const hasRole = u.roles?.includes(editingRole?.id);
                  return (
                    <div key={u.id} className="member-row">
                      <div className="member-avatar">
                        {u.avatar
                          ? <img src={'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png'} alt="" />
                          : <div className="member-avatar-placeholder">{u.username?.charAt(0).toUpperCase()}</div>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{u.displayName || u.username}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </div>
                      <button
                        className={'btn-base ' + (hasRole ? 'btn-danger' : 'btn-success')}
                        style={{ minWidth: 'auto', fontSize: '0.8rem' }}
                        onClick={() => handleToggleRole(u.id, hasRole)}
                      >
                        {hasRole ? 'Odbierz' : 'Nadaj'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      <style jsx>{`
        .roles-page { padding: 1.5rem; max-width: 1100px; }
        .roles-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .roles-header-left h1 { font-size: 1.5rem; color: var(--text-color); margin: 0 0 0.25rem 0; display: flex; align-items: center; gap: 0.6rem; }
        .roles-header-left p { color: var(--text-muted); font-size: 0.85rem; margin: 0; }

        .ws-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 50px; border: 1px solid; }
        .ws-badge.connected { color: #10b981; border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.08); }
        .ws-badge.disconnected, .ws-badge.unsupported { color: var(--text-muted); border-color: var(--border-color); background: transparent; }

        .roles-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .role-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(var(--surface-rgb), var(--surface-opacity)); border: 1px solid var(--border-color); border-radius: var(--border-radius); transition: border-color 0.2s; }
        .role-row:hover { border-color: var(--accent-color); }
        .role-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
        .role-info { flex: 1; min-width: 0; }
        .role-name { font-weight: 600; color: var(--text-color); font-size: 0.9rem; }
        .role-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem; }
        .role-tag { background: rgba(var(--surface-rgb), 0.8); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.7rem; }
        .role-actions { flex-shrink: 0; }

        .roles-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.4); border-radius: var(--border-radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .roles-error-title { display: flex; align-items: center; gap: 0.6rem; color: #ef4444; font-weight: 600; }
        .roles-error p { color: var(--text-muted); font-size: 0.9rem; margin: 0; }

        .roles-toast { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 0.85rem 1.25rem; border-radius: var(--border-radius); font-weight: 600; font-size: 0.9rem; box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: slideIn 0.25s ease; }
        .roles-toast.success { background: #10b981; color: #fff; }
        .roles-toast.error { background: #ef4444; color: #fff; }
        @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }

        .permissions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; max-height: 280px; overflow-y: auto; padding-right: 0.25rem; }
        .perm-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: var(--text-color); transition: background 0.15s; }
        .perm-item:hover { background: rgba(var(--surface-rgb), 0.5); }

        .members-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 360px; overflow-y: auto; }
        .member-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.5rem; border-radius: var(--border-radius); transition: background 0.15s; }
        .member-row:hover { background: rgba(var(--surface-rgb), 0.4); }
        .member-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
        .member-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .member-avatar-placeholder { width: 100%; height: 100%; background: var(--accent-color); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}
