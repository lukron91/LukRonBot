"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';
import LoadingScreen from '@/components/LoadingScreen';
import {
  FiHome, FiGrid, FiSettings, FiMessageSquare, FiShield,
  FiUsers, FiClipboard, FiActivity, FiLogOut, FiServer,
  FiDatabase, FiCheckCircle, FiXCircle, FiSun, FiChevronDown,
  FiZap, FiSmile
} from 'react-icons/fi';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [botOnGuild, setBotOnGuild] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [clientActive, setClientActive] = useState(false);
  const [serverActive, setServerActive] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState(null);
  const [botGuildIds, setBotGuildIds] = useState(new Set());
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('viewMode') || 'admin';
    }
    return 'admin';
  });
  const { theme, accentColor } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkStatuses = async () => {
      try {
        const healthRes = await fetch("/api/proxy/api/bot/health");
        const data = await healthRes.json();
        setClientActive(data.running === true);
      } catch { setClientActive(false); }

      try {
        const statusRes = await fetch("/api/proxy/api/status");
        setServerActive(statusRes.ok);
        const data = await statusRes.json();
        setDbStatus(data.db === true);
      } catch {
        setServerActive(false);
        setDbStatus(false);
      }
    };
    checkStatuses();
    const interval = setInterval(checkStatuses, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem("session");
    if (!sessionRaw) {
      router.push("/");
      return;
    }
    try {
      const session = JSON.parse(sessionRaw);
      setUser(session);
      setGuilds(session.guilds || []);
      const ownerId = process.env.NEXT_PUBLIC_OWNER_ID;
      setIsOwner(session.userId === ownerId);
      const guildId = searchParams.get("guild");
      if (guildId && session.guilds?.some(g => g.id === guildId)) {
        setSelectedGuildId(guildId);
      } else if (session.guilds?.length > 0) {
        router.push("/servers");
      } else {
        router.push("/servers");
      }

      // Pobierz serwery na których jest bot
      (async () => {
        try {
          const botRes = await fetch('/api/proxy/api/guilds');
          const botData = await botRes.json();
          if (botData.success) {
            setBotGuildIds(new Set((botData.guilds || []).map(g => g.id)));
          }
        } catch {}
      })();
    } catch (err) {
      console.error(err);
      router.push("/");
    }
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (!selectedGuildId) { setBotOnGuild(null); setUserPermissions(null); return; }
    const checkBot = async () => {
      try {
        const res = await fetch('/api/proxy/api/guilds/' + selectedGuildId + '/stats');
        if (res.ok) {
          setBotOnGuild(true);
        } else if (res.status === 404) {
          setBotOnGuild(false); // Bot nie jest na tym serwerze
        } else {
          // Inny błąd (np. 500) - bot może nie odpowiadać
          setBotOnGuild('error');
        }
      } catch { setBotOnGuild('error'); }
    };
    checkBot();
  }, [selectedGuildId]);

  // Przy zmianie trybu sprawdź czy obecny serwer jest dostępny
  useEffect(() => {
    if (!selectedGuildId || !guilds.length) return;
    // W trybie User czekaj aż botGuildIds się załaduje
    if (viewMode === 'user' && botGuildIds.size === 0) return;
    const availableIds = viewMode === 'admin'
      ? guilds.filter(g => (BigInt(g.permissions) & 0x8n) !== 0n).map(g => g.id)
      : guilds.filter(g => botGuildIds.has(g.id)).map(g => g.id);
    if (!availableIds.includes(selectedGuildId)) {
      router.push('/servers');
    }
  }, [viewMode, selectedGuildId, guilds, botGuildIds, router]);

  // Fetch uprawnień użytkownika na wybranym serwerze
  useEffect(() => {
    if (!selectedGuildId || !user?.userId) { setUserPermissions(null); return; }
    const fetchPerms = async () => {
      try {
        const res = await fetch(`/api/proxy/api/guilds/${selectedGuildId}/permissions/${user.userId}`);
        if (res.ok) {
          const data = await res.json();
          setUserPermissions(data);
        }
      } catch { setUserPermissions(null); }
    };
    fetchPerms();
  }, [selectedGuildId, user?.userId]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('session');
    window.location.href = '/';
  };

  const selectGuild = (guildId) => {
    setSelectedGuildId(guildId);
    setServerDropdownOpen(false);
    router.push(`${pathname}?guild=${guildId}`);
  };

  const getLink = (path) => selectedGuildId ? `${path}?guild=${selectedGuildId}` : path;
  const isActive = (path) => pathname === path;

  // Helper: czy user ma dane uprawnienie na wybranym serwerze
  const hasPerm = (perm) => userPermissions?.permissions?.includes(perm) || false;
  const canView = (section) => {
    if (viewMode === 'user') {
      // W widoku usera pokaz tylko sekcje dostępne dla każdego
      return ['tickets', 'welcome', 'music'].includes(section);
    }
    // W widoku admina — sprawdzaj uprawnienia
    if (isOwner) return true;
    switch (section) {
      case 'admin': return hasPerm('ADMINISTRATOR');
      case 'moderation': return hasPerm('KICK_MEMBERS') || hasPerm('BAN_MEMBERS') || hasPerm('MODERATE_MEMBERS');
      case 'roles': return hasPerm('MANAGE_ROLES') || hasPerm('ADMINISTRATOR');
      case 'config': return hasPerm('MANAGE_GUILD') || hasPerm('ADMINISTRATOR');
      case 'logs': return hasPerm('MANAGE_GUILD') || hasPerm('ADMINISTRATOR');
      case 'automod': return hasPerm('MANAGE_MESSAGES') || hasPerm('ADMINISTRATOR');
      case 'bot-settings': return isOwner;
      default: return true;
    }
  };

  if (!user) return <LoadingScreen fullPage />;
  const selectedGuild = guilds.find(g => g.id === selectedGuildId);
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1511561628733276280";
  const userAvatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`
    : null;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img src="/resources/logo.png" alt="LukRon Bot" className="logo-img" />
            <div className="logo-text">
              <h1 style={{ color: accentColor }}>LukRon Bot</h1>
              <span>Panel sterowania</span>
            </div>
          </div>
        </div>

        {/* ─── Profil użytkownika ─── */}
        <div className="user-profile">
          <div className="user-avatar-wrapper">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={user.username} className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-fallback" style={{ background: accentColor }}>
                {(user.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`user-status-dot ${clientActive ? 'online' : 'offline'}`} />
          </div>
          <div className="user-info-text">
            <span className="user-name">{user.global_name || user.username}</span>
            <span className="user-tag">@{user.username}</span>
            {isOwner && <span className="user-badge owner-badge">WŁAŚCICIEL</span>}
            {userPermissions?.isAdmin && !isOwner && <span className="user-badge admin-badge">ADMIN</span>}
            {userPermissions?.onServer && !userPermissions?.isAdmin && !isOwner && <span className="user-badge member-badge">UŻYTKOWNIK</span>}
          </div>
        </div>

        {/* ─── Przełącznik widoku ─── */}
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'admin' ? 'active' : ''}`}
            onClick={() => { setViewMode('admin'); localStorage.setItem('viewMode', 'admin'); window.dispatchEvent(new Event('viewModeChange')); }}
            style={viewMode === 'admin' ? { background: accentColor, borderColor: accentColor } : {}}
          >
            <FiShield size={14} />
            <span>Admin</span>
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'user' ? 'active' : ''}`}
            onClick={() => { setViewMode('user'); localStorage.setItem('viewMode', 'user'); window.dispatchEvent(new Event('viewModeChange')); }}
            style={viewMode === 'user' ? { background: accentColor, borderColor: accentColor } : {}}
          >
            <FiSmile size={14} />
            <span>User</span>
          </button>
        </div>

        {guilds.length > 0 && (
          <div className="server-selector">
            <div className="server-label">SERWER</div>
            <div className="dropdown-wrapper">
              <button
                className="server-dropdown-btn"
                onClick={() => setServerDropdownOpen(!serverDropdownOpen)}
              >
                <span>{selectedGuild ? selectedGuild.name : 'Wybierz serwer'}</span>
                <FiChevronDown className={serverDropdownOpen ? 'rotated' : ''} />
              </button>
              {serverDropdownOpen && (
                <div className="server-dropdown-list">
                  {(viewMode === 'admin' ? guilds.filter(g => (BigInt(g.permissions) & 0x8n) !== 0n) : guilds.filter(g => botGuildIds.has(g.id))).map((guild) => (
                    <button
                      key={guild.id}
                      className={`dropdown-item ${selectedGuildId === guild.id ? 'active' : ''}`}
                      onClick={() => selectGuild(guild.id)}
                      style={{ background: selectedGuildId === guild.id ? accentColor : '' }}
                    >
                      {guild.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">NAWIGACJA</div>
            <Link href="/servers" className={`nav-link ${isActive("/servers") ? 'active' : ''}`} style={{ color: isActive("/servers") ? accentColor : '', borderLeftColor: isActive("/servers") ? accentColor : 'transparent' }}>
              <FiGrid />
              <span>Wszystkie serwery</span>
            </Link>
          </div>

          {selectedGuildId && (
            <>
              <div className="nav-section">
                <div className="nav-section-title">SERWER</div>
                <Link href={getLink("/dashboard")} className={`nav-link ${isActive("/dashboard") ? 'active' : ''}`} style={{ color: isActive("/dashboard") ? accentColor : '', borderLeftColor: isActive("/dashboard") ? accentColor : 'transparent' }}>
                  <FiHome />
                  <span>Przegląd</span>
                </Link>
                {canView('config') && (
                  <Link href={getLink("/dashboard/config")} className={`nav-link ${pathname.includes("/dashboard/config") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/config") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/config") ? accentColor : 'transparent' }}>
                    <FiSettings />
                    <span>Konfiguracja ogólna</span>
                  </Link>
                )}
                {canView('roles') && (
                  <Link href={getLink("/dashboard/roles")} className={`nav-link ${pathname.includes("/dashboard/roles") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/roles") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/roles") ? accentColor : 'transparent' }}>
                    <FiShield />
                    <span>Zarządzanie rolami</span>
                  </Link>
                )}
                <Link href={getLink("/dashboard/users")} className={`nav-link ${pathname.includes("/dashboard/users") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/users") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/users") ? accentColor : 'transparent' }}>
                  <FiUsers />
                  <span>Lista użytkowników</span>
                </Link>
              </div>

              {canView('moderation') && (
                <div className="nav-section">
                  <div className="nav-section-title">MODERACJA</div>
                  <Link href={getLink("/dashboard/moderation/settings")} className={`nav-link ${pathname.includes("/dashboard/moderation/settings") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/moderation/settings") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/moderation/settings") ? accentColor : 'transparent' }}>
                    <FiShield />
                    <span>Ustawienia moderacji</span>
                  </Link>
                </div>
              )}

              <div className="nav-section">
                <div className="nav-section-title">TICKETY</div>
                <Link href={getLink("/dashboard/tickets")} className={`nav-link ${pathname.includes("/dashboard/tickets") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/tickets") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/tickets") ? accentColor : 'transparent' }}>
                  <FiMessageSquare />
                  <span>Tickety</span>
                </Link>
              </div>

              {canView('automod') && (
                <div className="nav-section">
                  <div className="nav-section-title">AUTO-MOD</div>
                  <Link href={getLink("/dashboard/automod")} className={`nav-link ${pathname.includes("/dashboard/automod") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/automod") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/automod") ? accentColor : 'transparent' }}>
                    <FiZap />
                    <span>Automod</span>
                  </Link>
                </div>
              )}

              <div className="nav-section">
                <div className="nav-section-title">POWITANIA</div>
                <Link href={getLink("/dashboard/welcome")} className={`nav-link ${pathname.includes("/dashboard/welcome") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/welcome") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/welcome") ? accentColor : 'transparent' }}>
                  <FiSmile />
                  <span>Powitania</span>
                </Link>
              </div>

              {canView('logs') && (
                <div className="nav-section">
                  <div className="nav-section-title">LOGI</div>
                  <Link href={getLink("/dashboard/logs")} className={`nav-link ${pathname.includes("/dashboard/logs") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/logs") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/logs") ? accentColor : 'transparent' }}>
                    <FiClipboard />
                    <span>Logi</span>
                  </Link>
                </div>
              )}

              <div className="nav-section">
                <div className="nav-section-title">USTAWIENIA</div>
                <Link href={getLink("/dashboard/theme")} className={`nav-link ${pathname.includes("/dashboard/theme") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/theme") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/theme") ? accentColor : 'transparent' }}>
                  <FiSun />
                  <span>Motyw</span>
                </Link>
              </div>

              {canView('bot-settings') && (
                <div className="nav-section">
                  <div className="nav-section-title">ZARZĄDZANIE BOTEM</div>
                  <Link href={getLink("/dashboard/bot-settings")} className={`nav-link ${pathname === "/dashboard/bot-settings" ? 'active' : ''}`} style={{ color: pathname === "/dashboard/bot-settings" ? accentColor : '', borderLeftColor: pathname === "/dashboard/bot-settings" ? accentColor : 'transparent' }}>
                    <FiActivity />
                    <span>Health & Status</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <FiLogOut />
            <span>Wyloguj</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <img src="/resources/baner-dashboard.png" alt="" className="top-bar-bg" />
          <div className="top-bar-overlay" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 75%, var(--bg-color) 100%)` }} />
          <div className="top-bar-content">
            {selectedGuild && (
              <div className="server-info">
                {selectedGuild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
                    alt={selectedGuild.name}
                    className="server-avatar"
                  />
                ) : (
                  <div className="server-avatar" style={{ background: accentColor }}>
                    {selectedGuild.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="server-details">
                  <h2>{selectedGuild.name}</h2>
                  <span>ID: {selectedGuild.id}</span>
                </div>
              </div>
            )}

            <div className="status-indicators">
              <div className={`status-item ${clientActive ? 'online' : 'offline'}`}>
                <FiServer />
                <span>{clientActive ? 'Client aktywny' : 'Client nieaktywny'}</span>
                {clientActive ? <FiCheckCircle /> : <FiXCircle />}
              </div>
              <div className={`status-item ${serverActive ? 'online' : 'offline'}`}>
                <FiDatabase />
                <span>{serverActive ? 'Server aktywny' : 'Server nieaktywny'}</span>
                {serverActive ? <FiCheckCircle /> : <FiXCircle />}
              </div>
              <div className={`status-item ${dbStatus ? 'online' : 'offline'}`}>
                <FiDatabase />
                <span>{dbStatus ? 'Baza danych SQLite' : 'Brak bazy danych'}</span>
                {dbStatus ? <FiCheckCircle /> : <FiXCircle />}
              </div>
            </div>
          </div>
        </header>

        {selectedGuildId && botOnGuild === 'error' ? (
          <div className="bot-warning">
            <div className="warning-content">
              <h1>🔌 Bot nie odpowiada</h1>
              <p>Serwer bota jest offline lub wystąpił błąd połączenia. Statusy na górze strony pokazują szczegóły.</p>
              <p className="refresh-hint">Spróbuj odświeżyć stronę za chwilę (F5).</p>
            </div>
          </div>
        ) : selectedGuildId && botOnGuild === false ? (
          <div className="bot-warning">
            <div className="warning-content">
              <h1>🤖 Bot nie jest dodany do tego serwera</h1>
              <p>Aby korzystać z panelu, dodaj bota do serwera {selectedGuild?.name}.</p>
              <a
                href={`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`}
                className="add-bot-btn"
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: accentColor }}
              >
                Dodaj bota do serwera
              </a>
              <p className="refresh-hint">Po dodaniu bota odśwież stronę (F5).</p>
            </div>
          </div>
        ) : (
          <div className="page-content-wrapper">
            {children}
          </div>
        )}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Potwierdź wylogowanie">
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Czy na pewno chcesz się wylogować? Będziesz musiał ponownie zalogować się przez Discord, aby uzyskać dostęp do panelu.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowLogoutModal(false)} className="btn-base btn-standard" style={{ background: 'var(--border-color)', boxShadow: 'none' }}>Anuluj</button>
          <button onClick={confirmLogout} className="btn-base btn-danger">Wyloguj się</button>
        </div>
      </Modal>

      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: transparent;
          color: var(--text-color, #ffffff);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
        }

        .sidebar {
          width: 280px;
          background: rgba(var(--surface-rgb, 17, 17, 24), var(--surface-opacity, 0.95));
          border-right: 1px solid var(--border-color, #1e1e26);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color, #1e1e26);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-img {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .logo-text h1 {
          font-size: 1rem;
          margin: 0;
        }

        .logo-text span {
          font-size: 0.7rem;
          color: var(--text-muted, #6b6b76);
        }

        .server-selector {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color, #1e1e26);
          position: relative;
        }

        .server-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted, #6b6b76);
          margin-bottom: 0.5rem;
        }

        .dropdown-wrapper {
          position: relative;
        }

        .server-dropdown-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.75rem;
          background: var(--bg-color, #0a0a0f);
          border: 1px solid var(--border-color, #1e1e26);
          border-radius: var(--border-radius, 12px);
          color: var(--text-color, #ffffff);
          font-size: 0.85rem;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .server-dropdown-btn .rotated {
          transform: rotate(180deg);
        }

        .server-dropdown-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: rgba(var(--surface-rgb, 20, 20, 28), var(--surface-opacity, 0.95));
          border: 1px solid var(--border-color, #1e1e26);
          border-radius: var(--border-radius, 12px);
          z-index: 100;
          max-height: 250px;
          overflow-y: auto;
          backdrop-filter: blur(8px);
        }

        .dropdown-item {
          width: 100%;
          padding: 0.6rem 0.75rem;
          background: none;
          border: none;
          color: var(--text-color, #ffffff);
          text-align: left;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }

        .dropdown-item:hover {
          background: var(--border-color, #1e1e26);
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 0;
          scrollbar-width: thin;
          scrollbar-color: var(--border-color) transparent;
        }
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 99px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        .nav-section {
          margin-bottom: 0.5rem;
        }

        .nav-section-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted, #6b6b76);
          padding: 0.5rem 1rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.2s;
          border-left: 3px solid transparent;
          color: var(--text-color, #ffffff);
        }

        .nav-link:hover {
          background: rgba(var(--surface-rgb, 20, 20, 28), 0.3);
        }

        .nav-link.active {
          background: rgba(var(--surface-rgb, 20, 20, 28), 0.5);
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-color, #1e1e26);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          background: none;
          border: 1px solid var(--border-color, #1e1e26);
          border-radius: var(--border-radius, 12px);
          color: var(--text-muted, #9c9ca7);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: rgba(var(--surface-rgb, 20, 20, 28), 0.3);
          color: var(--text-color, #ffffff);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
          background: transparent;
          padding: 2rem;
        }

        .page-content-wrapper {
          width: 100%;
          max-width: 1100px;
          margin: 1.5rem auto 0;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          background: rgba(var(--surface-rgb), var(--panel-opacity));
          backdrop-filter: blur(12px);
        }

        .top-bar {
          position: relative;
          height: 200px;
          overflow: hidden;
          flex-shrink: 0;
          margin: -2rem -2rem 0 -2rem;
          padding: 0;
          display: block;
        }

        .top-bar-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }

        .top-bar-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.1) 0%,
            rgba(0, 0, 0, 0.55) 100%
          );
        }

        .top-bar-content {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 1rem 1.5rem 1.25rem 1.5rem;
        }

        .server-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .server-avatar {
          width: 56px;
          height: 56px;
          border-radius: var(--border-radius, 12px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.4rem;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          object-fit: cover;
          color: #fff;
        }

        .server-details h2 {
          font-size: 1.3rem;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          color: #fff;
        }

        .server-details span {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }

        .status-indicators {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.75rem;
          border-radius: var(--border-radius, 12px);
          font-size: 0.8rem;
          border: 1px solid;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(4px);
        }

        .status-item.online {
          background: rgba(16, 185, 129, 0.15);
          border-color: #10b981;
          color: #10b981;
        }

        .status-item.offline {
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          color: #ef4444;
        }

        .bot-warning {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .warning-content {
          text-align: center;
          max-width: 500px;
          background: rgba(var(--surface-rgb), var(--surface-opacity));
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 2.5rem 2rem;
          backdrop-filter: blur(12px);
        }

        .warning-content h1 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--text-color, #fff);
        }

        .warning-content p {
          color: var(--text-muted, #6b6b76);
          margin-bottom: 1.5rem;
        }

        .add-bot-btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          color: #fff;
          text-decoration: none;
          border-radius: var(--border-radius, 12px);
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .add-bot-btn:hover {
          opacity: 0.9;
        }

        .refresh-hint {
          font-size: 0.85rem;
          margin-top: 1rem;
          color: var(--text-muted, #6b6b76);
        }

        /* ─── Profil użytkownika ─── */
        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color, #1e1e26);
        }

        .user-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.1rem;
          color: #fff;
        }

        .user-status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--bg-color, #0a0a0f);
        }

        .user-status-dot.online { background: #10b981; }
        .user-status-dot.offline { background: #ef4444; }

        .user-info-text {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
          flex: 1;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-tag {
          font-size: 0.7rem;
          color: var(--text-muted, #6b6b76);
        }

        .user-badge {
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
          margin-top: 0.15rem;
        }

        .owner-badge {
          background: rgba(234, 179, 8, 0.2);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }

        .admin-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .member-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        /* ─── Przełącznik widoku ─── */
        .view-toggle {
          display: flex;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid var(--border-color, #1e1e26);
        }

        .view-toggle-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.4rem 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color, #1e1e26);
          border-radius: 8px;
          color: var(--text-muted, #6b6b76);
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .view-toggle-btn:hover {
          color: var(--text-color, #fff);
          border-color: var(--text-muted);
        }

        .view-toggle-btn.active {
          color: #fff;
        }
      `}</style>
    </div>
  );
}