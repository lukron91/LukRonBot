"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiX, FiRefreshCw, FiUser, FiShield, FiSearch, FiCalendar, FiClock, FiAward, FiDollarSign, FiTrendingUp, FiMessageSquare, FiHash, FiStar } from 'react-icons/fi';
import DraggableWindow from '@/components/DraggableWindow';

function getViewMode() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('viewMode') || 'admin';
  }
  return 'admin';
}
import { useTheme } from '@/lib/theme-context';

export default function UsersPage() {
  const { accentColor } = useTheme();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");

  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState("profile"); // profile | moderation
  const [viewMode, setViewMode] = useState(getViewMode);

  // Reaguj na zmiany viewMode z layoutu
  useEffect(() => {
    const check = () => {
      const v = getViewMode();
      setViewMode(v);
    };
    // Od┼Ťwie┼╝ przy ka┼╝dym klikni─Öciu (toggle zmienia localStorage)
    document.addEventListener('click', check);
    window.addEventListener('viewModeChange', check);
    window.addEventListener('storage', check);
    return () => { document.removeEventListener('click', check); window.removeEventListener('viewModeChange', check); window.removeEventListener('storage', check); };
  }, []);
  const [punishments, setPunishments] = useState({ warnings: [], mutes: [], bans: [] });
  const [activePunishments, setActivePunishments] = useState({ mute: null, ban: null });
  const [history, setHistory] = useState([]);
  const [modTab, setModTab] = useState("punish"); // punish | active | warns | history
  const [punishType, setPunishType] = useState("warn");
  const [punishReason, setPunishReason] = useState("");
  const [punishDuration, setPunishDuration] = useState("");
  const [punishDurationUnit, setPunishDurationUnit] = useState("minutes");
  const [punishing, setPunishing] = useState(false);
  const [punishResult, setPunishResult] = useState(null);

  // Fetch members
  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    fetch('/api/proxy/api/guilds/' + guildId + '/members')
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : data?.users || data?.members || [];
        setUsers(arr);
        setFiltered(arr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  // Filter
  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    const t = search.toLowerCase();
    setFiltered(users.filter(u => u.username?.toLowerCase().includes(t) || u.displayName?.toLowerCase().includes(t)));
  }, [search, users]);

  const openProfile = async (user) => {
    setSelectedUser(user);
    setProfileTab("profile");
    setProfileLoading(true);
    setProfile(null);
    try {
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/users/' + user.id);
      if (res.ok) setProfile(await res.json());
    } catch {}
    setProfileLoading(false);
  };

  const openModeration = async (user) => {
    setSelectedUser(user);
    setProfileTab("moderation");
    setProfileLoading(true);
    setProfile(null);
    try {
      const [uRes, pRes, aRes, hRes] = await Promise.all([
        fetch('/api/proxy/api/guilds/' + guildId + '/users/' + user.id),
        fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + user.id),
        fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + user.id + '/active'),
        fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + user.id),
      ]);
      if (uRes.ok) setProfile(await uRes.json());
      const pData = await pRes.json();
      setPunishments({ warnings: pData?.warnings || [], mutes: pData?.mutes || [], bans: pData?.bans || [] });
      const aData = await aRes.json();
      setActivePunishments({ mute: aData?.mute || null, ban: aData?.ban || null });
      const hData = await hRes.json();
      setHistory(hData?.punishments || []);
    } catch {}
    setProfileLoading(false);
  };

  const applyPunishment = async () => {
    if (!selectedUser || !punishReason.trim()) return;
    setPunishing(true);
    setPunishResult(null);
    try {
      const body = { type: punishType, reason: punishReason };
      if ((punishType === 'mute' || punishType === 'ban') && punishDuration) {
        const minutes = punishDurationUnit === 'hours' ? parseInt(punishDuration) * 60
          : punishDurationUnit === 'days' ? parseInt(punishDuration) * 1440
          : parseInt(punishDuration);
        body.duration = minutes;
      }
      const res = await fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + selectedUser.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPunishResult({ success: true, message: 'Kara zosta┼éa na┼éo┼╝ona.' });
        setPunishReason("");
        setPunishDuration("");
        // Od┼Ťwie┼╝ dane
        const [pRes, aRes, hRes] = await Promise.all([
          fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + selectedUser.id),
          fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + selectedUser.id + '/active'),
          fetch('/api/proxy/api/guilds/' + guildId + '/punishments/' + selectedUser.id),
        ]);
        const pData = await pRes.json();
        setPunishments({ warnings: pData?.warnings || [], mutes: pData?.mutes || [], bans: pData?.bans || [] });
        const aData = await aRes.json();
        setActivePunishments({ mute: aData?.mute || null, ban: aData?.ban || null });
        const hData = await hRes.json();
        setHistory(hData?.punishments || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setPunishResult({ success: false, message: err?.error || err?.message || 'Nie uda┼éo si─Ö na┼éo┼╝y─ç kary.' });
      }
    } catch {
      setPunishResult({ success: false, message: 'B┼é─ůd po┼é─ůczenia z serwerem.' });
    }
    setPunishing(false);
  };

  const closeProfile = () => {
    setSelectedUser(null);
    setProfile(null);
    setPunishments({ warnings: [], mutes: [], bans: [] });
    setActivePunishments({ mute: null, ban: null });
    setHistory([]);
    setPunishResult(null);
    setPunishReason("");
    setPunishDuration("");
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ÔÇö';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ÔÇö';

  const avatarUrl = (u) => u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null;
  const guildAvatarUrl = (u) => u.guildAvatar ? `https://cdn.discordapp.com/guilds/${guildId}/users/${u.id}/avatars/${u.guildAvatar}.png` : null;

  return (
    <div className="up-root">
      {/* Header */}
      <div className="up-header">
        <div className="up-header-left">
          <h2 className="up-title">Lista u┼╝ytkownik├│w</h2>
          <p className="up-sub">{users.length} cz┼éonk├│w</p>
        </div>
        <div className="up-search-wrap">
          <FiSearch className="up-search-icon" />
          <input className="up-search" placeholder="Szukaj u┼╝ytkownika..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="up-loading">┼üadowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="up-empty">Brak u┼╝ytkownik├│w{search ? ' dla tego wyszukiwania' : ''}.</div>
      ) : (
        <div className="up-list">
          {filtered.map(u => (
            <div key={u.id} className="up-row" onClick={() => openProfile(u)}>
              <div className="up-avatar">
                {u.avatar
                  ? <img src={`https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`} alt="" />
                  : <div className="up-avatar-pl" style={{ background: accentColor }}>{u.username?.charAt(0).toUpperCase()}</div>
                }
              </div>
              <div className="up-info">
                <span className="up-name">{u.displayName || u.username}</span>
                <span className="up-tag">@{u.username}</span>
              </div>
              <button className="up-profile-btn" onClick={(e) => { e.stopPropagation(); openProfile(u); }} style={{ borderColor: accentColor, color: accentColor }}>
                <FiUser /> Profil
              </button>
              {viewMode === 'admin' && (
                <button className="up-mod-btn" onClick={(e) => { e.stopPropagation(); openModeration(u); }}>
                  <FiShield /> Moderacja
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal profilu */}
      {selectedUser && (
        <DraggableWindow
          isOpen={true}
          onClose={closeProfile}
          title={'U┼╝ytkownik: ' + (selectedUser?.displayName || selectedUser?.username || '')}
          width={600}
          height="auto"
          id="user-profile"
        >
          <div className="up-modal-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <button className={`up-tab ${profileTab === 'profile' ? 'active' : ''}`} onClick={() => setProfileTab('profile')} style={profileTab === 'profile' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
              <FiUser /> Profil
            </button>
            {viewMode === 'admin' && (
              <button className={`up-tab ${profileTab === 'moderation' ? 'active' : ''}`} onClick={() => setProfileTab('moderation')} style={profileTab === 'moderation' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
                <FiShield /> Moderacja
              </button>
            )}
          </div>

          <div className="up-modal-body">
              {profileLoading ? (
                <div className="up-loading">┼üadowanie danych...</div>
              ) : profileTab === 'profile' && profile ? (
                <div className="up-profile">
                  {/* Avatar + podstawowe info */}
                  <div className="up-profile-top">
                    <div className="up-profile-avatar-wrap">
                      {guildAvatarUrl(profile) ? (
                        <img src={guildAvatarUrl(profile)} alt="" className="up-profile-avatar" />
                      ) : avatarUrl(profile) ? (
                        <img src={avatarUrl(profile)} alt="" className="up-profile-avatar" />
                      ) : (
                        <div className="up-profile-avatar up-profile-avatar-pl" style={{ background: accentColor }}>
                          {profile.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {profile.bot && <span className="up-bot-badge">BOT</span>}
                    </div>
                    <div className="up-profile-info">
                      <h3 className="up-profile-name">{profile.globalName || profile.displayName || profile.username}</h3>
                      <span className="up-profile-tag">@{profile.username}</span>
                      <div className="up-profile-badges">
                        {profile.isOwner && <span className="up-badge owner">W┼üA┼ÜCICIEL</span>}
                        {profile.isAdmin && !profile.isOwner && <span className="up-badge admin">ADMIN</span>}
                        {profile.nickname && <span className="up-badge nick">­čôŁ {profile.nickname}</span>}
                        {profile.premiumSince && <span className="up-badge boost">ÔşÉ Boostuje od {formatDate(profile.premiumSince)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Szczeg├│┼éy */}
                  <div className="up-profile-details">
                    <div className="up-detail-row"><FiCalendar /> <span>Konto utworzone</span> <strong>{formatDateTime(profile.createdAt)}</strong></div>
                    <div className="up-detail-row"><FiClock /> <span>Do┼é─ůczy┼é</span> <strong>{formatDateTime(profile.joinedAt)}</strong></div>
                    {profile.accentColor && <div className="up-detail-row"><FiStar /> <span>Kolor akcentu</span> <strong><span className="up-color-dot" style={{ background: profile.accentColor }} /> {profile.accentColor}</strong></div>}
                  </div>

                  {/* Role */}
                  {profile.roles?.length > 0 && (
                    <div className="up-section-block">
                      <h4><FiShield /> Role ({profile.roles.length})</h4>
                      <div className="up-roles">
                        {profile.roles.map(r => (
                          <span key={r.id} className="up-role" style={{ borderColor: r.color !== '#000000' ? r.color : 'var(--border-color)', color: r.color !== '#000000' ? r.color : 'var(--text-color)' }}>
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Uprawnienia */}
                  {profile.permissions?.length > 0 && (
                    <div className="up-section-block">
                      <h4><FiShield /> Kluczowe uprawnienia</h4>
                      <div className="up-perms">
                        {profile.permissions.map(p => (
                          <span key={p} className="up-perm-tag">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Miejsce na przysz┼ée funkcje: poziom, waluta itp */}
                  <div className="up-section-block up-future">
                    <h4><FiTrendingUp /> Poziomy i ekonomia</h4>
                    <p className="up-future-text">Funkcje w przygotowaniu ÔÇö poziom, XP, waluta i inne pojawi─ů si─Ö wkr├│tce.</p>
                  </div>
                </div>
              ) : profileTab === 'moderation' ? (
                <div className="up-moderation">
                  <h3 className="up-mod-title">Dzia┼éania moderacyjne dla {selectedUser?.username}</h3>

                  {/* Podtaby moderacji */}
                  <div className="up-mod-subtabs">
                    <button className={`up-mod-subtab ${modTab === 'punish' ? 'active' : ''}`} onClick={() => setModTab('punish')} style={modTab === 'punish' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
                      Na┼é├│┼╝ kar─Ö
                    </button>
                    <button className={`up-mod-subtab ${modTab === 'active' ? 'active' : ''}`} onClick={() => setModTab('active')} style={modTab === 'active' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
                      Aktywne kary
                    </button>
                    <button className={`up-mod-subtab ${modTab === 'warns' ? 'active' : ''}`} onClick={() => setModTab('warns')} style={modTab === 'warns' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
                      Warny
                    </button>
                    <button className={`up-mod-subtab ${modTab === 'history' ? 'active' : ''}`} onClick={() => setModTab('history')} style={modTab === 'history' ? { borderBottomColor: accentColor, color: accentColor } : {}}>
                      Historia
                    </button>
                  </div>

                  <div className="up-mod-content">
                    {/* Podtab: Na┼é├│┼╝ kar─Ö */}
                    {modTab === 'punish' && (
                      <div className="up-punish-form">
                        <div className="up-punish-types">
                          {[
                            { id: 'warn', icon: 'ÔÜá´ŞĆ', label: 'Warn', desc: 'Ostrze┼╝enie' },
                            { id: 'mute', icon: '­čöç', label: 'Wycisz', desc: 'Czasowe wyciszenie' },
                            { id: 'ban', icon: '­čöĘ', label: 'Ban', desc: 'Blokada dost─Öpu' },
                            { id: 'kick', icon: '­čĹó', label: 'Kick', desc: 'Wyrzucenie' },
                          ].map(t => (
                            <button
                              key={t.id}
                              className={`up-punish-type-btn ${punishType === t.id ? 'active' : ''}`}
                              onClick={() => setPunishType(t.id)}
                              style={punishType === t.id ? { borderColor: accentColor, color: accentColor, background: accentColor + '15' } : {}}
                            >
                              <span className="up-type-icon">{t.icon}</span>
                              <span className="up-type-label">{t.label}</span>
                              <span className="up-type-desc">{t.desc}</span>
                            </button>
                          ))}
                        </div>

                        {(punishType === 'mute' || punishType === 'ban') && (
                          <div className="up-punish-duration">
                            <label>Czas trwania:</label>
                            <div className="up-duration-inputs">
                              <div className="up-input-wrap">
                                <input
                                  type="number"
                                  className="up-input"
                                  placeholder="30"
                                  value={punishDuration}
                                  onChange={e => setPunishDuration(e.target.value)}
                                  min="1"
                                />
                              </div>
                              <div className="up-select-wrap">
                                <select
                                  className="up-select"
                                  value={punishDurationUnit}
                                  onChange={e => setPunishDurationUnit(e.target.value)}
                                >
                                  <option value="minutes">Minut</option>
                                  <option value="hours">Godzin</option>
                                  <option value="days">Dni</option>
                                </select>
                                <svg className="up-select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="up-punish-reason">
                          <label>Pow├│d:</label>
                          <div className="up-textarea-wrap">
                            <textarea
                              className="up-textarea"
                              placeholder="Podaj pow├│d kary..."
                              value={punishReason}
                              onChange={e => setPunishReason(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>

                        <button
                          className="up-punish-submit"
                          onClick={applyPunishment}
                          disabled={punishing || !punishReason.trim()}
                          style={{ background: accentColor }}
                        >
                          {punishing ? 'Nak┼éadanie...' : `Na┼é├│┼╝ ${punishType === 'warn' ? 'Warna' : punishType === 'mute' ? 'Wyciszenie' : punishType === 'ban' ? 'Bana' : 'Kicka'}`}
                        </button>

                        {punishResult && (
                          <div className={`up-punish-result ${punishResult.success ? 'success' : 'error'}`}>
                            {punishResult.success ? 'Ôťů ' : 'ÔŁî '}{punishResult.message}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Podtab: Aktywne kary */}
                    {modTab === 'active' && (
                      <div>
                        {(activePunishments.mute || activePunishments.ban) ? (
                          <div className="up-section-block">
                            {activePunishments.mute && <div className="up-active-pun">­čöç Wyciszony ÔÇö wygasa: {formatDateTime(activePunishments.mute.expiresAt)}</div>}
                            {activePunishments.ban && <div className="up-active-pun">­čöĘ Zbanowany ÔÇö {activePunishments.ban.reason || 'brak powodu'}</div>}
                          </div>
                        ) : (
                          <p className="up-empty" style={{ padding: '1.5rem' }}>Brak aktywnych kar.</p>
                        )}
                      </div>
                    )}

                    {/* Podtab: Warny */}
                    {modTab === 'warns' && (
                      <div>
                        {punishments.warnings?.length > 0 ? (
                          <div className="up-section-block">
                            {punishments.warnings.map((w, i) => (
                              <div key={i} className="up-pun-item">
                                <span className="up-pun-type warn">WARN #{i + 1}</span>
                                <span>{w.reason || 'brak powodu'}</span>
                                <span className="up-pun-date">{formatDateTime(w.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="up-empty" style={{ padding: '1.5rem' }}>Brak warn├│w.</p>
                        )}
                      </div>
                    )}

                    {/* Podtab: Historia */}
                    {modTab === 'history' && (
                      <div>
                        {history.length > 0 ? (
                          <div className="up-section-block">
                            {history.map((h, i) => (
                              <div key={i} className="up-pun-item">
                                <span className={`up-pun-type ${h.type}`}>{h.type.toUpperCase()}</span>
                                <span>{h.reason || 'brak powodu'}</span>
                                <span className="up-pun-date">{formatDateTime(h.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="up-empty" style={{ padding: '1.5rem' }}>Brak historii kar.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
        </DraggableWindow>
      )}

      <style jsx>{`
        .up-root { padding: 1.5rem; }
        .up-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .up-header-left { }
        .up-title { font-size: 1.3rem; font-weight: 700; color: var(--text-color); margin: 0; }
        .up-sub { font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0 0; }
        .up-search-wrap { position: relative; }
        .up-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .up-search { background: rgba(var(--surface-rgb), 0.3); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 0.6rem 1rem 0.6rem 2.2rem; color: var(--text-color); font-size: 0.85rem; width: 240px; outline: none; }
        .up-search:focus { border-color: ${accentColor}; }
        .up-loading, .up-empty { text-align: center; padding: 3rem; color: var(--text-muted); }
        .up-list { display: flex; flex-direction: column; gap: 0.25rem; }
        .up-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: var(--border-radius); cursor: pointer; transition: background 0.15s; }
        .up-row:hover { background: rgba(var(--surface-rgb), 0.2); }
        .up-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
        .up-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .up-avatar-pl { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 0.9rem; }
        .up-info { flex: 1; min-width: 0; }
        .up-name { display: block; font-weight: 600; color: var(--text-color); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .up-tag { font-size: 0.7rem; color: var(--text-muted); }
        .up-profile-btn, .up-mod-btn { padding: 0.4rem 0.75rem; border-radius: var(--border-radius); font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap; }
        .up-profile-btn { background: transparent; border: 1px solid; }
        .up-mod-btn { background: rgba(var(--surface-rgb), 0.3); border: 1px solid var(--border-color); color: var(--text-muted); }
        .up-mod-btn:hover { color: var(--text-color); }

        /* Modal - tabs only (DraggableWindow handles the rest) */
        .up-modal-tabs { display: flex; }
        .up-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.85rem 1rem; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .up-tab:hover { color: var(--text-color); background: rgba(var(--surface-rgb), 0.1); }
        .up-modal-body { overflow-y: auto; padding: 1.25rem; flex: 1; }

        /* Profil */
        .up-profile-top { display: flex; gap: 1rem; margin-bottom: 1.25rem; }
        .up-profile-avatar-wrap { position: relative; width: 72px; height: 72px; flex-shrink: 0; }
        .up-profile-avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
        .up-profile-avatar-pl { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.5rem; font-weight: 700; border-radius: 50%; }
        .up-bot-badge { position: absolute; bottom: -2px; right: -2px; background: #5865F2; color: #fff; font-size: 0.6rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
        .up-profile-info { flex: 1; }
        .up-profile-name { font-size: 1.1rem; font-weight: 700; color: var(--text-color); margin: 0; }
        .up-profile-tag { font-size: 0.8rem; color: var(--text-muted); }
        .up-profile-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
        .up-badge { font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .up-badge.owner { background: #FAA61A; color: #000; }
        .up-badge.admin { background: #5865F2; color: #fff; }
        .up-badge.nick { background: rgba(var(--surface-rgb), 0.5); color: var(--text-color); }
        .up-badge.boost { background: rgba(255, 115, 250, 0.2); color: #FF73FA; }

        .up-profile-details { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .up-detail-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
        .up-detail-row strong { margin-left: auto; color: var(--text-color); }
        .up-color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: 0.25rem; }

        .up-section-block { margin-bottom: 1rem; }
        .up-section-block h4 { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.4rem; }
        .up-roles { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .up-role { font-size: 0.75rem; padding: 0.2rem 0.6rem; border: 1px solid; border-radius: 4px; font-weight: 500; }
        .up-perms { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .up-perm-tag { font-size: 0.7rem; background: rgba(var(--surface-rgb), 0.3); padding: 0.2rem 0.5rem; border-radius: 4px; color: var(--text-muted); }
        .up-future { opacity: 0.6; }
        .up-future-text { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

        /* Moderacja */
        .up-mod-title { font-size: 1rem; font-weight: 600; color: var(--text-color); margin: 0 0 1rem; }
        .up-mod-subtabs { display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem; gap: 0; }
        .up-mod-subtab { padding: 0.6rem 0.85rem; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .up-mod-subtab:hover { color: var(--text-color); background: rgba(var(--surface-rgb), 0.1); }
        .up-mod-content { min-height: 100px; }

        /* Formularz kar */
        .up-punish-form { display: flex; flex-direction: column; gap: 1rem; }
        .up-punish-types { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
        .up-punish-type-btn { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--surface-color); color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
        .up-punish-type-btn:hover { border-color: var(--text-muted); color: var(--text-color); background: rgba(var(--surface-rgb), 0.5); }
        .up-punish-type-btn.active { border-width: 2px; }
        .up-type-icon { font-size: 1.3rem; line-height: 1; }
        .up-type-label { font-size: 0.8rem; font-weight: 700; color: var(--text-color); }
        .up-type-desc { font-size: 0.65rem; color: var(--text-muted); }
        .up-punish-duration label, .up-punish-reason label { display: block; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .up-duration-inputs { display: flex; gap: 0.5rem; align-items: stretch; }
        .up-input-wrap { flex: 1; position: relative; }
        .up-input { width: 100%; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); color: var(--text-color); font-size: 0.85rem; padding: 0.55rem 0.75rem; outline: none; transition: border-color 0.15s; }
        .up-input:focus { border-color: ${accentColor}; }
        .up-input::placeholder { color: var(--text-muted); opacity: 0.5; }
        /* Ukryj domy┼Ťlne strza┼éki input type=number */
        .up-input::-webkit-outer-spin-button,
        .up-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .up-input[type='number'] { -moz-appearance: textfield; appearance: textfield; }
        .up-select-wrap { position: relative; min-width: 120px; }
        .up-select { width: 100%; height: 100%; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); color: var(--text-color); font-size: 0.85rem; padding: 0.55rem 2rem 0.55rem 0.75rem; outline: none; cursor: pointer; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; -moz-appearance: none; }
        .up-select:focus { border-color: ${accentColor}; }
        .up-select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); }
        .up-textarea-wrap { position: relative; }
        .up-textarea { width: 100%; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); color: var(--text-color); font-size: 0.85rem; padding: 0.55rem 0.75rem; outline: none; resize: vertical; font-family: inherit; transition: border-color 0.15s; }
        .up-textarea:focus { border-color: ${accentColor}; }
        .up-textarea::placeholder { color: var(--text-muted); opacity: 0.5; }
        .up-punish-submit { padding: 0.65rem 1.5rem; border: none; border-radius: var(--border-radius); color: #fff; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.1s; align-self: flex-start; }
        .up-punish-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .up-punish-submit:not(:disabled):hover { opacity: 0.9; }
        .up-punish-submit:not(:disabled):active { transform: scale(0.97); }
        .up-punish-result { font-size: 0.8rem; padding: 0.55rem 0.85rem; border-radius: var(--border-radius); }
        .up-punish-result.success { background: rgba(87, 242, 135, 0.1); border: 1px solid rgba(87, 242, 135, 0.3); color: #57F287; }
        .up-punish-result.error { background: rgba(237, 66, 69, 0.1); border: 1px solid rgba(237, 66, 69, 0.3); color: #ED4245; }

        .up-active-pun { font-size: 0.85rem; padding: 0.5rem 0.75rem; background: rgba(237, 66, 69, 0.1); border: 1px solid rgba(237, 66, 69, 0.3); border-radius: var(--border-radius); color: #ED4245; margin-bottom: 0.5rem; }
        .up-pun-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); color: var(--text-color); }
        .up-pun-item:last-child { border-bottom: none; }
        .up-pun-date { margin-left: auto; color: var(--text-muted); font-size: 0.7rem; white-space: nowrap; }
        .up-pun-type { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 3px; }
        .up-pun-type.warn { background: rgba(250, 166, 26, 0.2); color: #FAA61A; }
        .up-pun-type.mute { background: rgba(254, 231, 92, 0.2); color: #FEE75C; }
        .up-pun-type.ban { background: rgba(237, 66, 69, 0.2); color: #ED4245; }
      `}</style>
    </div>
  );
}
