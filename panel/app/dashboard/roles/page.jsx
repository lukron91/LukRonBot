"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';
import LoadingScreen from '@/components/LoadingScreen';
import {
  FiShield, FiPlus, FiEdit2, FiTrash2, FiCopy, FiRefreshCw,
  FiUsers, FiChevronUp, FiChevronDown, FiSearch, FiAlertTriangle,
  FiWifi, FiWifiOff, FiLock, FiUnlock, FiCheck, FiX
} from 'react-icons/fi';

// ─── Stałe ──────────────────────────────────────────────────────────────────

// Pełna lista uprawnień Discord pogrupowana tematycznie
const PERMISSION_GROUPS = [
  {
    label: 'Ogólne',
    perms: [
      { key: 'Administrator',       label: 'Administrator',              desc: 'Wszystkie uprawnienia, omija kanałowe overrides' },
      { key: 'ManageGuild',         label: 'Zarządzaj serwerem',         desc: 'Zmiana ustawień serwera' },
      { key: 'ManageRoles',         label: 'Zarządzaj rolami',           desc: 'Tworzenie i edycja ról poniżej swojej' },
      { key: 'ManageChannels',      label: 'Zarządzaj kanałami',         desc: 'Tworzenie, edycja, usuwanie kanałów' },
      { key: 'ManageWebhooks',      label: 'Zarządzaj webhookami',       desc: 'Tworzenie i edycja webhooków' },
      { key: 'ManageEmojisAndStickers', label: 'Zarządzaj emoji',       desc: 'Dodawanie i usuwanie emoji/naklejek' },
      { key: 'ViewAuditLog',        label: 'Przeglądaj logi',            desc: 'Dostęp do dziennika audytu' },
      { key: 'ViewGuildInsights',   label: 'Statystyki serwera',         desc: 'Dostęp do statystyk' },
    ]
  },
  {
    label: 'Członkowie',
    perms: [
      { key: 'KickMembers',         label: 'Wyrzucaj członków',          desc: 'Wyrzucanie użytkowników z serwera' },
      { key: 'BanMembers',          label: 'Banuj członków',             desc: 'Banowanie i odbanowywanie' },
      { key: 'MuteMembers',         label: 'Wyciszaj (voice)',           desc: 'Wyciszanie w kanałach głosowych' },
      { key: 'DeafenMembers',       label: 'Ogłuszaj (voice)',           desc: 'Ogłuszanie w kanałach głosowych' },
      { key: 'MoveMembers',         label: 'Przenoś członków',           desc: 'Przenoszenie między kanałami voice' },
      { key: 'ManageNicknames',     label: 'Zarządzaj pseudonimami',     desc: 'Zmiana pseudonimów innych' },
      { key: 'ChangeNickname',      label: 'Zmień pseudonim',            desc: 'Zmiana własnego pseudonimu' },
      { key: 'ModerateMembers',     label: 'Timeout',                    desc: 'Nakładanie timeoutów' },
    ]
  },
  {
    label: 'Wiadomości',
    perms: [
      { key: 'SendMessages',        label: 'Wysyłaj wiadomości',         desc: 'Pisanie na kanałach tekstowych' },
      { key: 'SendMessagesInThreads', label: 'Wysyłaj w wątkach',       desc: 'Pisanie w wątkach' },
      { key: 'CreatePublicThreads', label: 'Twórz wątki publiczne',      desc: 'Otwieranie publicznych wątków' },
      { key: 'CreatePrivateThreads', label: 'Twórz wątki prywatne',     desc: 'Otwieranie prywatnych wątków' },
      { key: 'ManageMessages',      label: 'Zarządzaj wiadomościami',    desc: 'Usuwanie cudzych wiadomości, pinowanie' },
      { key: 'ManageThreads',       label: 'Zarządzaj wątkami',          desc: 'Archiwizacja i usuwanie wątków' },
      { key: 'EmbedLinks',          label: 'Osadzaj linki',              desc: 'Podgląd linków w wiadomościach' },
      { key: 'AttachFiles',         label: 'Załączaj pliki',             desc: 'Wysyłanie plików i obrazów' },
      { key: 'ReadMessageHistory',  label: 'Czytaj historię',            desc: 'Przewijanie historii wiadomości' },
      { key: 'MentionEveryone',     label: 'Wzmiankuj @everyone',        desc: 'Pingowanie @everyone i @here' },
      { key: 'UseExternalEmojis',   label: 'Zewnętrzne emoji',           desc: 'Emoji z innych serwerów' },
      { key: 'UseExternalStickers', label: 'Zewnętrzne naklejki',        desc: 'Naklejki z innych serwerów' },
      { key: 'AddReactions',        label: 'Dodawaj reakcje',            desc: 'Reagowanie na wiadomości' },
      { key: 'UseApplicationCommands', label: 'Komendy slash',          desc: 'Używanie komend slash i kontekstowych' },
    ]
  },
  {
    label: 'Kanały',
    perms: [
      { key: 'ViewChannel',         label: 'Wyświetlaj kanały',          desc: 'Widzenie kanałów tekstowych i głosowych' },
      { key: 'Connect',             label: 'Połącz (voice)',              desc: 'Wchodzenie do kanałów głosowych' },
      { key: 'Speak',               label: 'Mów (voice)',                 desc: 'Mówienie w kanałach głosowych' },
      { key: 'Stream',              label: 'Streamuj',                   desc: 'Udostępnianie ekranu i kamera' },
      { key: 'UseVAD',              label: 'Aktywacja głosem',           desc: 'Bez konieczności PTT' },
      { key: 'PrioritySpeaker',     label: 'Priorytetowy mówca',         desc: 'Głośność innych zmniejszana' },
      { key: 'RequestToSpeak',      label: 'Poproś o głos',              desc: 'Stage channels — prośba o głos' },
    ]
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key));

function intToHex(int) {
  if (!int) return '#000000';
  return '#' + int.toString(16).padStart(6, '0');
}
function hexToInt(hex) {
  const clean = hex.replace('#', '');
  return parseInt(clean, 16) || 0;
}

const EMPTY_FORM = { name: '', color: '#3b82f6', hoist: false, mentionable: false, permissions: [] };

// ─── Główny komponent ────────────────────────────────────────────────────────

export default function RolesPage() {
  const { accentColor } = useTheme();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [wsStatus, setWsStatus]     = useState('disconnected');

  // Panel prawy — wybrany szczegół
  const [selected, setSelected]     = useState(null); // obiekt roli

  // Modalne
  const [modal, setModal]           = useState(null); // 'create'|'delete'|'assign'|'members'
  const [roleForm, setRoleForm]     = useState(EMPTY_FORM);
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving]         = useState(false);

  // Assign / members
  const [allMembers, setAllMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch]     = useState('');

  // Szukaj w liście ról
  const [roleSearch, setRoleSearch] = useState('');

  // Toast
  const [toast, setToast]           = useState(null);

  const wsRef   = useRef(null);
  const pollRef = useRef(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    if (!guildId) return;
    try {
      const res  = await fetch('/api/proxy/api/guilds/' + guildId + '/roles/detailed');
      const text = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : (data.roles || []);
      setRoles(list);
      // Odśwież wybraną rolę jeśli była zaznaczona
      setSelected(prev => prev ? (list.find(r => r.id === prev.id) || null) : null);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  // ─── WebSocket + fallback ───────────────────────────────────────────────────

  useEffect(() => {
    if (!guildId) return;
    fetchRoles();

    let ws;
    try {
      ws = new WebSocket('ws://localhost:3001/ws?guildId=' + guildId);
      wsRef.current = ws;
      ws.onopen    = () => { setWsStatus('connected'); stopPolling(); };
      ws.onclose   = () => { setWsStatus('disconnected'); startPolling(); };
      ws.onerror   = () => { setWsStatus('unsupported'); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (['roleCreate','roleUpdate','roleDelete','guildMemberUpdate'].includes(msg.type)) fetchRoles();
        } catch {}
      };
    } catch {
      setWsStatus('unsupported');
      startPolling();
    }

    return () => { ws?.close(); stopPolling(); };
  }, [guildId]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchRoles, 10000);
  };
  const stopPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const safeFetch = async (url, opts = {}) => {
    const res  = await fetch(url, opts);
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data;
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await safeFetch('/api/proxy/api/guilds/' + guildId + '/members');
      const list = Array.isArray(data) ? data : (data.members || data.users || []);
      setAllMembers(list);
    } catch { setAllMembers([]); }
    finally { setMembersLoading(false); }
  };

  // ─── Akcje ──────────────────────────────────────────────────────────────────

  const handleSaveRole = async () => {
    setSaving(true);
    try {
      const body = {
        name: roleForm.name || 'Nowa rola',
        color: hexToInt(roleForm.color),
        hoist: roleForm.hoist,
        mentionable: roleForm.mentionable,
        permissions: roleForm.permissions,
      };
      if (selected && modal === null) {
        // Edycja przez panel prawy — bez modala
        await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + selected.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        showToast('✅ Rola zaktualizowana');
      } else {
        // Tworzenie — przez modal 'create'
        await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        showToast('✅ Rola utworzona');
        setModal(null);
      }
      await fetchRoles();
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + selected.id, { method: 'DELETE' });
      showToast('✅ Rola usunięta');
      setSelected(null);
      setModal(null);
      await fetchRoles();
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  };

  const handleCopy = async (role) => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + role.id + '/copy', { method: 'POST' });
      showToast('✅ Skopiowano "' + role.name + '"');
      await fetchRoles();
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  };

  const handleMove = async (role, dir) => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + role.id + '/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: dir }),
      });
      await fetchRoles();
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  };

  const handleToggleRoleMember = async (userId, hasRole) => {
    try {
      await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + selected.id + '/members/' + userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: hasRole ? 'remove' : 'add' }),
      });
      showToast(hasRole ? '✅ Rola odebrana' : '✅ Rola nadana');
      await loadMembers();
      await fetchRoles();
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  };

  const selectRole = (role) => {
    setSelected(role);
    setRoleForm({
      name: role.name,
      color: intToHex(role.color),
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions || [],
    });
    setPermSearch('');
  };

  const openCreate = () => {
    setRoleForm(EMPTY_FORM);
    setPermSearch('');
    setModal('create');
  };

  const openAssign = async () => {
    setMemberSearch('');
    setModal('assign');
    await loadMembers();
  };

  const openMembers = async () => {
    setMemberSearch('');
    setModal('members');
    setMembersLoading(true);
    try {
      const data = await safeFetch('/api/proxy/api/guilds/' + guildId + '/roles/' + selected.id + '/members');
      setAllMembers(data.members || []);
    } catch { setAllMembers([]); }
    finally { setMembersLoading(false); }
  };

  const togglePerm = (key) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const setAllPerms = (val) => {
    setRoleForm(prev => ({ ...prev, permissions: val ? [...ALL_PERMISSIONS] : [] }));
  };

  // ─── Pochodne ───────────────────────────────────────────────────────────────

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const filteredPerms = PERMISSION_GROUPS.map(g => ({
    ...g,
    perms: g.perms.filter(p =>
      p.label.toLowerCase().includes(permSearch.toLowerCase()) ||
      p.desc.toLowerCase().includes(permSearch.toLowerCase())
    ),
  })).filter(g => g.perms.length > 0);

  const filteredMembers = allMembers.filter(m =>
    (m.username || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.displayName || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!guildId) return (
    <div className="rp-empty">Wybierz serwer z lewego menu.</div>
  );
  if (loading) return (
    <LoadingScreen message="Ładowanie ról..." />
  );
  if (error) return (
    <div className="rp-error-wrap">
      <div className="rp-error">
        <div className="rp-error-title"><FiAlertTriangle /> Brak połączenia z serwerem</div>
        <p>{error}</p>
        <button className="btn-base btn-standard" onClick={fetchRoles}><FiRefreshCw /> Spróbuj ponownie</button>
      </div>
    </div>
  );

  const hasChanges = selected && (
    roleForm.name !== selected.name ||
    roleForm.color !== intToHex(selected.color) ||
    roleForm.hoist !== selected.hoist ||
    roleForm.mentionable !== selected.mentionable ||
    JSON.stringify([...roleForm.permissions].sort()) !== JSON.stringify([...(selected.permissions||[])].sort())
  );

  return (
    <div className="rp-root">

      {/* ── Toast ── */}
      {toast && <div className={'rp-toast ' + toast.type}>{toast.text}</div>}

      {/* ── Layout: dwie kolumny ── */}
      <div className="rp-layout">

        {/* ══ Kolumna lewa: lista ról ══ */}
        <div className="rp-sidebar">
          <div className="rp-sidebar-head">
            <div className="rp-sidebar-title">
              <FiShield /> Role serwera
              <span className="rp-count">{roles.length}</span>
            </div>
            <div className="btn-row">
              <div className={'rp-ws ' + wsStatus} title={wsStatus === 'connected' ? 'Real-time aktywny' : 'Polling co 10s'}>
                {wsStatus === 'connected' ? <FiWifi /> : <FiWifiOff />}
              </div>
              <button className="btn-base btn-standard rp-icon-btn" title="Odśwież" onClick={fetchRoles}><FiRefreshCw /></button>
              <button className="btn-base btn-success rp-icon-btn" title="Nowa rola" onClick={openCreate}><FiPlus /></button>
            </div>
          </div>

          <div className="rp-search-wrap">
            <FiSearch className="rp-search-icon" />
            <input
              className="rp-search"
              placeholder="Szukaj roli..."
              value={roleSearch}
              onChange={e => setRoleSearch(e.target.value)}
            />
            {roleSearch && <FiX className="rp-search-clear" onClick={() => setRoleSearch('')} />}
          </div>

          <div className="rp-list">
            {filteredRoles.length === 0 && (
              <div className="rp-list-empty">Brak ról.</div>
            )}
            {filteredRoles.map((role, idx) => (
              <div
                key={role.id}
                className={'rp-role-row' + (selected?.id === role.id ? ' active' : '') + (role.managed ? ' managed' : '')}
                onClick={() => selectRole(role)}
              >
                <div className="rp-role-dot" style={{ background: role.color ? intToHex(role.color) : '#99aab5' }} />
                <div className="rp-role-info">
                  <span className="rp-role-name">{role.name}</span>
                  <span className="rp-role-sub">
                    <FiUsers size={10} /> {role.memberCount ?? 0}
                    {role.managed && <span className="rp-tag rp-tag-managed">bot</span>}
                    {role.hoist && <span className="rp-tag">wydzielona</span>}
                  </span>
                </div>
                <div className="rp-role-actions" onClick={e => e.stopPropagation()}>
                  <button className="rp-act-btn" title="Wyżej" onClick={() => handleMove(role, 'up')}><FiChevronUp /></button>
                  <button className="rp-act-btn" title="Niżej" onClick={() => handleMove(role, 'down')}><FiChevronDown /></button>
                  <button className="rp-act-btn" title="Kopiuj" onClick={() => handleCopy(role)}><FiCopy /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Kolumna prawa: szczegół / edytor ══ */}
        <div className="rp-detail">
          {!selected ? (
            <div className="rp-detail-empty">
              <FiShield size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p>Wybierz rolę z listy aby zobaczyć szczegóły i edytować</p>
            </div>
          ) : (
            <>
              {/* Header szczegółu */}
              <div className="rp-detail-head">
                <div className="rp-detail-title">
                  <div className="rp-detail-dot" style={{ background: intToHex(selected.color) }} />
                  <span>{selected.name}</span>
                  {selected.managed && <span className="rp-tag rp-tag-managed"><FiLock size={10} /> zarządzana</span>}
                </div>
                <div className="btn-row">
                  <button className="btn-base btn-standard" onClick={openMembers}>
                    <FiUsers /> Członkowie ({selected.memberCount ?? 0})
                  </button>
                  {!selected.managed && (
                    <button className="btn-base btn-standard" onClick={openAssign}>
                      <FiUnlock /> Nadaj / odbierz
                    </button>
                  )}
                  {!selected.managed && (
                    <button className="btn-base btn-danger" onClick={() => setModal('delete')}>
                      <FiTrash2 /> Usuń
                    </button>
                  )}
                </div>
              </div>

              {selected.managed && (
                <div className="rp-managed-notice">
                  <FiLock /> Ta rola jest zarządzana przez bota lub integrację — nie można jej edytować ani usunąć.
                </div>
              )}

              {/* Edytor */}
              {!selected.managed && (
                <div className="rp-editor">

                  {/* ── Podstawowe ── */}
                  <div className="rp-section">
                    <div className="rp-section-title">Podstawowe</div>
                    <div className="rp-fields-row">
                      <div className="rp-field rp-field-grow">
                        <label>Nazwa roli</label>
                        <input
                          className="modal-input"
                          value={roleForm.name}
                          onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Nazwa roli"
                        />
                      </div>
                      <div className="rp-field">
                        <label>Kolor</label>
                        <div className="rp-color-wrap">
                          <input
                            type="color"
                            value={roleForm.color}
                            onChange={e => setRoleForm(p => ({ ...p, color: e.target.value }))}
                            className="rp-color-input"
                          />
                          <span className="rp-color-hex">{roleForm.color}</span>
                          <button
                            className="rp-color-reset"
                            title="Bez koloru"
                            onClick={() => setRoleForm(p => ({ ...p, color: '#000000' }))}
                          >✕</button>
                        </div>
                      </div>
                    </div>

                    <div className="rp-toggles-row">
                      <label className="rp-toggle-item">
                        <label className="toggle-switch">
                          <input type="checkbox" checked={roleForm.hoist} onChange={e => setRoleForm(p => ({ ...p, hoist: e.target.checked }))} />
                          <span className="slider" />
                        </label>
                        <div>
                          <span className="rp-toggle-label">Wyświetlaj oddzielnie</span>
                          <span className="rp-toggle-desc">Rola widoczna jako osobna sekcja na liście członków</span>
                        </div>
                      </label>
                      <label className="rp-toggle-item">
                        <label className="toggle-switch">
                          <input type="checkbox" checked={roleForm.mentionable} onChange={e => setRoleForm(p => ({ ...p, mentionable: e.target.checked }))} />
                          <span className="slider" />
                        </label>
                        <div>
                          <span className="rp-toggle-label">Możliwa wzmianka</span>
                          <span className="rp-toggle-desc">Każdy może pingować @ta-rola</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* ── Uprawnienia ── */}
                  <div className="rp-section">
                    <div className="rp-section-head">
                      <div className="rp-section-title">Uprawnienia</div>
                      <div className="btn-row">
                        <button className="rp-perm-quick btn-base btn-standard" onClick={() => setAllPerms(true)}>
                          <FiCheck /> Wszystkie
                        </button>
                        <button className="rp-perm-quick btn-base btn-danger" onClick={() => setAllPerms(false)}>
                          <FiX /> Żadne
                        </button>
                      </div>
                    </div>

                    <div className="rp-perm-search-wrap">
                      <FiSearch className="rp-search-icon" />
                      <input
                        className="rp-search"
                        placeholder="Szukaj uprawnienia..."
                        value={permSearch}
                        onChange={e => setPermSearch(e.target.value)}
                      />
                    </div>

                    <div className="rp-perms">
                      {filteredPerms.map(group => (
                        <div key={group.label} className="rp-perm-group">
                          <div className="rp-perm-group-label">{group.label}</div>
                          {group.perms.map(perm => (
                            <label key={perm.key} className="rp-perm-item">
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions.includes(perm.key)}
                                  onChange={() => togglePerm(perm.key)}
                                />
                                <span className="slider" />
                              </label>
                              <div className="rp-perm-text">
                                <span className="rp-perm-label">{perm.label}</span>
                                <span className="rp-perm-desc">{perm.desc}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Zapis ── */}
                  <div className="rp-save-bar">
                    {hasChanges && <span className="rp-unsaved">Masz niezapisane zmiany</span>}
                    <button
                      className="btn-base btn-success"
                      onClick={handleSaveRole}
                      disabled={saving || !hasChanges}
                    >
                      {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modal: Utwórz ── */}
      {modal === 'create' && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Nowa rola" width="560px">
          <div className="modal-tab-content">
            <div className="modal-section">
              <div className="modal-section-title">Podstawowe</div>
              <input className="modal-input" placeholder="Nazwa roli" value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} />
              <div className="rp-color-wrap" style={{ marginBottom: '0.75rem' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.5rem' }}>Kolor:</label>
                <input type="color" value={roleForm.color} onChange={e => setRoleForm(p => ({ ...p, color: e.target.value }))} className="rp-color-input" />
                <span className="rp-color-hex">{roleForm.color}</span>
              </div>
              <div className="rp-toggles-row">
                <label className="rp-toggle-item">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={roleForm.hoist} onChange={e => setRoleForm(p => ({ ...p, hoist: e.target.checked }))} />
                    <span className="slider" />
                  </label>
                  <span className="rp-toggle-label">Wyświetlaj oddzielnie</span>
                </label>
                <label className="rp-toggle-item">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={roleForm.mentionable} onChange={e => setRoleForm(p => ({ ...p, mentionable: e.target.checked }))} />
                    <span className="slider" />
                  </label>
                  <span className="rp-toggle-label">Wzmiankowana</span>
                </label>
              </div>
            </div>
            <div className="btn-row-end">
              <button className="btn-base btn-standard" onClick={() => setModal(null)}>Anuluj</button>
              <button className="btn-base btn-success" onClick={handleSaveRole} disabled={saving}>
                {saving ? 'Tworzenie...' : 'Utwórz rolę'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Usuń ── */}
      {modal === 'delete' && selected && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Usuń rolę" width="400px">
          <div className="modal-tab-content">
            <p style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>
              Czy na pewno chcesz usunąć rolę{' '}
              <strong style={{ color: accentColor }}>{selected.name}</strong>?{' '}
              Tej operacji nie można cofnąć.
            </p>
            <div className="btn-row-end">
              <button className="btn-base btn-standard" onClick={() => setModal(null)}>Anuluj</button>
              <button className="btn-base btn-danger" onClick={handleDelete}>Usuń</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Nadaj / odbierz ── */}
      {modal === 'assign' && selected && (
        <Modal isOpen={true} onClose={() => setModal(null)} title={'Nadaj / odbierz: ' + selected.name} width="520px">
          <div className="modal-tab-content">
            <input className="modal-input" placeholder="Szukaj użytkownika..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
            {membersLoading ? (
              <div className="modal-empty">Ładowanie...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="modal-empty">Brak wyników.</div>
            ) : (
              <div className="rp-member-list">
                {filteredMembers.map(u => {
                  const hasRole = (u.roles || []).includes(selected.id);
                  return (
                    <div key={u.id} className="rp-member-row">
                      <div className="rp-member-avatar">
                        {u.avatar
                          ? <img src={'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png'} alt="" />
                          : <div className="rp-member-placeholder">{(u.username || '?')[0].toUpperCase()}</div>
                        }
                      </div>
                      <div className="rp-member-info">
                        <span className="rp-member-name">{u.displayName || u.username}</span>
                        <span className="rp-member-sub">@{u.username}</span>
                      </div>
                      {hasRole && <span className="rp-has-role"><FiCheck size={12} /> Ma rolę</span>}
                      <button
                        className={'btn-base ' + (hasRole ? 'btn-danger' : 'btn-success')}
                        style={{ minWidth: 'auto', fontSize: '0.8rem' }}
                        onClick={() => handleToggleRoleMember(u.id, hasRole)}
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

      {/* ── Modal: Członkowie ── */}
      {modal === 'members' && selected && (
        <Modal isOpen={true} onClose={() => setModal(null)} title={'Członkowie: ' + selected.name} width="460px">
          <div className="modal-tab-content">
            <input className="modal-input" placeholder="Szukaj..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
            {membersLoading ? (
              <div className="modal-empty">Ładowanie...</div>
            ) : allMembers.length === 0 ? (
              <div className="modal-empty">Nikt nie ma tej roli.</div>
            ) : (
              <div className="rp-member-list">
                {allMembers.filter(m =>
                  (m.username || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
                  (m.displayName || '').toLowerCase().includes(memberSearch.toLowerCase())
                ).map(m => (
                  <div key={m.id} className="rp-member-row">
                    <div className="rp-member-avatar">
                      {m.avatar
                        ? <img src={'https://cdn.discordapp.com/avatars/' + m.id + '/' + m.avatar + '.png'} alt="" />
                        : <div className="rp-member-placeholder">{(m.username || '?')[0].toUpperCase()}</div>
                      }
                    </div>
                    <div className="rp-member-info">
                      <span className="rp-member-name">{m.displayName || m.username}</span>
                      <span className="rp-member-sub">@{m.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      <style jsx>{`
        .rp-root { display: flex; flex-direction: column; height: calc(100vh - 200px); padding: 1.25rem; gap: 0; }
        .rp-empty { padding: 3rem; text-align: center; color: var(--text-muted); }
        .rp-error-wrap { padding: 2rem; max-width: 560px; margin: 2rem auto; }
        .rp-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.35); border-radius: var(--border-radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .rp-error-title { display: flex; align-items: center; gap: 0.5rem; color: #ef4444; font-weight: 600; }
        .rp-error p { color: var(--text-muted); font-size: 0.9rem; margin: 0; }

        /* Layout */
        .rp-layout { display: grid; grid-template-columns: 300px 1fr; gap: 0; height: 100%; border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden; }

        /* Lewa kolumna */
        .rp-sidebar { display: flex; flex-direction: column; border-right: 1px solid var(--border-color); background: rgba(var(--surface-rgb), var(--surface-opacity)); overflow: hidden; }
        .rp-sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
        .rp-sidebar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.9rem; color: var(--text-color); }
        .rp-count { background: var(--accent-color); color: #fff; font-size: 0.7rem; font-weight: 700; border-radius: 50px; padding: 0.1rem 0.5rem; }
        .rp-ws { display: flex; align-items: center; font-size: 0.8rem; padding: 0.2rem 0.4rem; border-radius: 4px; }
        .rp-ws.connected { color: #10b981; }
        .rp-ws.disconnected, .rp-ws.unsupported { color: var(--text-muted); }
        .rp-icon-btn { padding: 0.4rem !important; min-width: auto !important; }

        .rp-search-wrap { position: relative; padding: 0.75rem; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
        .rp-search { width: 100%; padding: 0.5rem 2rem 0.5rem 2rem; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); color: var(--text-color); font-size: 0.85rem; }
        .rp-search:focus { outline: none; border-color: var(--accent-color); }
        .rp-search-icon { position: absolute; left: 1.35rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem; pointer-events: none; }
        .rp-search-clear { position: absolute; right: 1.35rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; font-size: 0.85rem; }

        .rp-list { flex: 1; overflow-y: auto; }
        .rp-list-empty { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
        .rp-role-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.65rem 1rem; cursor: pointer; transition: background 0.15s; border-left: 3px solid transparent; }
        .rp-role-row:hover { background: rgba(var(--surface-rgb), 0.4); }
        .rp-role-row.active { background: rgba(var(--surface-rgb), 0.7); border-left-color: var(--accent-color); }
        .rp-role-row.managed { opacity: 0.7; }
        .rp-role-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.15); }
        .rp-role-info { flex: 1; min-width: 0; }
        .rp-role-name { display: block; font-weight: 600; font-size: 0.85rem; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rp-role-sub { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.1rem; }
        .rp-tag { font-size: 0.65rem; padding: 0.1rem 0.35rem; border-radius: 3px; background: rgba(var(--surface-rgb), 0.8); border: 1px solid var(--border-color); }
        .rp-tag-managed { color: var(--text-muted); }
        .rp-role-actions { display: flex; gap: 0.15rem; opacity: 0; transition: opacity 0.15s; }
        .rp-role-row:hover .rp-role-actions { opacity: 1; }
        .rp-act-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.2rem; border-radius: 4px; font-size: 0.85rem; display: flex; transition: all 0.15s; }
        .rp-act-btn:hover { color: var(--text-color); background: rgba(var(--surface-rgb), 0.5); }

        /* Prawa kolumna */
        .rp-detail { display: flex; flex-direction: column; overflow: hidden; background: var(--bg-color); }
        .rp-detail-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); text-align: center; padding: 2rem; }
        .rp-detail-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); flex-shrink: 0; flex-wrap: wrap; gap: 0.75rem; background: rgba(var(--surface-rgb), var(--surface-opacity)); }
        .rp-detail-title { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1rem; color: var(--text-color); }
        .rp-detail-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.15); }

        .rp-managed-notice { margin: 1rem 1.25rem 0; padding: 0.75rem 1rem; background: rgba(var(--surface-rgb), 0.5); border: 1px solid var(--border-color); border-radius: var(--border-radius); color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }

        .rp-editor { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .rp-section { background: rgba(var(--surface-rgb), var(--tab-opacity)); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1.25rem; }
        .rp-section-title { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-color); margin-bottom: 1rem; }
        .rp-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .rp-section-head .rp-section-title { margin-bottom: 0; }
        .rp-perm-quick { font-size: 0.75rem !important; }

        .rp-fields-row { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
        .rp-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .rp-field-grow { flex: 1; }
        .rp-field label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }

        .rp-color-wrap { display: flex; align-items: center; gap: 0.5rem; }
        .rp-color-input { width: 44px; height: 36px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: none; padding: 2px; }
        .rp-color-hex { font-size: 0.8rem; color: var(--text-muted); font-family: monospace; }
        .rp-color-reset { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; padding: 0.2rem; border-radius: 4px; }
        .rp-color-reset:hover { color: var(--text-color); }

        .rp-toggles-row { display: flex; flex-direction: column; gap: 0.75rem; }
        .rp-toggle-item { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
        .rp-toggle-label { font-size: 0.85rem; font-weight: 600; color: var(--text-color); display: block; }
        .rp-toggle-desc { font-size: 0.75rem; color: var(--text-muted); display: block; }

        .rp-perm-search-wrap { position: relative; margin-bottom: 1rem; }
        .rp-perms { display: flex; flex-direction: column; gap: 1rem; max-height: 380px; overflow-y: auto; padding-right: 0.25rem; }
        .rp-perm-group-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 0.5rem; }
        .rp-perm-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.6rem; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
        .rp-perm-item:hover { background: rgba(var(--surface-rgb), 0.5); }
        .rp-perm-text { display: flex; flex-direction: column; }
        .rp-perm-label { font-size: 0.85rem; color: var(--text-color); font-weight: 500; }
        .rp-perm-desc { font-size: 0.75rem; color: var(--text-muted); }

        .rp-save-bar { display: flex; align-items: center; justify-content: flex-end; gap: 1rem; padding: 0.75rem 0; border-top: 1px solid var(--border-color); margin-top: auto; }
        .rp-unsaved { font-size: 0.8rem; color: #f59e0b; font-weight: 600; }

        /* Modal members/assign */
        .rp-member-list { display: flex; flex-direction: column; gap: 0.35rem; max-height: 380px; overflow-y: auto; }
        .rp-member-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.4rem; border-radius: var(--border-radius); transition: background 0.15s; }
        .rp-member-row:hover { background: rgba(var(--surface-rgb), 0.4); }
        .rp-member-avatar { width: 34px; height: 34px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
        .rp-member-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .rp-member-placeholder { width: 100%; height: 100%; background: var(--accent-color); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 0.85rem; }
        .rp-member-info { flex: 1; min-width: 0; }
        .rp-member-name { display: block; font-weight: 600; font-size: 0.85rem; color: var(--text-color); }
        .rp-member-sub { font-size: 0.75rem; color: var(--text-muted); }
        .rp-has-role { font-size: 0.72rem; color: #10b981; display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0; }

        /* Toast */
        .rp-toast { position: fixed; top: 1.25rem; right: 1.25rem; z-index: 9999; padding: 0.75rem 1.25rem; border-radius: var(--border-radius); font-weight: 600; font-size: 0.9rem; box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: rpSlide 0.25s ease; }
        .rp-toast.success { background: #10b981; color: #fff; }
        .rp-toast.error { background: #ef4444; color: #fff; }
        @keyframes rpSlide { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
