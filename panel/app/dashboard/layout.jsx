"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from '@/lib/theme-context';
import {
  FiArrowLeft, FiGrid, FiSettings, FiMessageSquare, FiShield,
  FiUserPlus, FiFileText, FiActivity, FiLogOut, FiServer,
  FiDatabase, FiCheckCircle, FiXCircle, FiSun, FiChevronDown
} from 'react-icons/fi';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [mongoStatus, setMongoStatus] = useState(null);
  const [botOnGuild, setBotOnGuild] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [clientActive, setClientActive] = useState(false);
  const [serverActive, setServerActive] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const { theme, accentColor, updateTheme } = useTheme();
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
        setMongoStatus(data.mongo === true);
      } catch {
        setServerActive(false);
        setMongoStatus(false);
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
    } catch (err) {
      console.error(err);
      router.push("/");
    }
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (!selectedGuildId) { setBotOnGuild(null); return; }
    const checkBot = async () => {
      try {
        const res = await fetch(`/api/proxy/api/guilds/${selectedGuildId}/stats`);
        setBotOnGuild(res.ok);
      } catch { setBotOnGuild(false); }
    };
    checkBot();
  }, [selectedGuildId]);

  const handleLogout = () => {
    if (window.confirm("Czy na pewno chcesz się wylogować?")) {
      localStorage.removeItem("session");
      router.push("/");
    }
  };

  const selectGuild = (guildId) => {
    setSelectedGuildId(guildId);
    setServerDropdownOpen(false);
    router.push(`${pathname}?guild=${guildId}`);
  };

  const getLink = (path) => selectedGuildId ? `${path}?guild=${selectedGuildId}` : path;
  const isActive = (path) => pathname === path;

  if (!user) return null;
  const selectedGuild = guilds.find(g => g.id === selectedGuildId);
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1511561628733276280";

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
                  {guilds.map((guild) => (
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
            <div className="nav-section-title">SERWER</div>
            <Link href="/servers" className={`nav-link ${isActive("/servers") ? 'active' : ''}`} style={{ color: isActive("/servers") ? accentColor : '', borderLeftColor: isActive("/servers") ? accentColor : 'transparent' }}>
              <FiGrid />
              <span>Wszystkie serwery</span>
            </Link>
          </div>

          {selectedGuildId && (
            <>
              <div className="nav-section">
                <div className="nav-section-title">OGÓLNE</div>
                <Link href={getLink("/dashboard")} className={`nav-link ${isActive("/dashboard") ? 'active' : ''}`} style={{ color: isActive("/dashboard") ? accentColor : '', borderLeftColor: isActive("/dashboard") ? accentColor : 'transparent' }}>
                  <FiArrowLeft />
                  <span>Przegląd</span>
                </Link>
                <Link href={getLink("/dashboard/config")} className={`nav-link ${pathname.includes("/dashboard/config") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/config") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/config") ? accentColor : 'transparent' }}>
                  <FiSettings />
                  <span>Konfiguracja</span>
                </Link>
                <Link href={getLink("/dashboard/theme")} className={`nav-link ${pathname.includes("/dashboard/theme") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/theme") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/theme") ? accentColor : 'transparent' }}>
                  <FiSun />
                  <span>Motyw</span>
                </Link>
              </div>

              <div className="nav-section">
                <div className="nav-section-title">MODERACJA</div>
                <Link href={getLink("/dashboard/moderation/users")} className={`nav-link ${pathname.includes("/dashboard/moderation/users") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/moderation/users") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/moderation/users") ? accentColor : 'transparent' }}>
                  <FiUserPlus />
                  <span>Lista użytkowników</span>
                </Link>
                <Link href={getLink("/dashboard/moderation/settings")} className={`nav-link ${pathname.includes("/dashboard/moderation/settings") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/moderation/settings") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/moderation/settings") ? accentColor : 'transparent' }}>
                  <FiShield />
                  <span>Ustawienia moderacji</span>
                </Link>
              </div>

              <div className="nav-section">
                <div className="nav-section-title">TICKETY</div>
                <Link href={getLink("/dashboard/tickets")} className={`nav-link ${pathname.includes("/dashboard/tickets") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/tickets") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/tickets") ? accentColor : 'transparent' }}>
                  <FiMessageSquare />
                  <span>Tickety</span>
                </Link>
              </div>

              <div className="nav-section">
                <div className="nav-section-title">AUTO-MOD</div>
                <Link href={getLink("/dashboard/automod")} className={`nav-link ${pathname.includes("/dashboard/automod") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/automod") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/automod") ? accentColor : 'transparent' }}>
                  <FiShield />
                  <span>Automod</span>
                </Link>
              </div>

              <div className="nav-section">
                <div className="nav-section-title">POWITANIA</div>
                <Link href={getLink("/dashboard/welcome")} className={`nav-link ${pathname.includes("/dashboard/welcome") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/welcome") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/welcome") ? accentColor : 'transparent' }}>
                  <FiFileText />
                  <span>Powitania</span>
                </Link>
              </div>

              <div className="nav-section">
                <div className="nav-section-title">LOGI</div>
                <Link href={getLink("/dashboard/logs")} className={`nav-link ${pathname.includes("/dashboard/logs") ? 'active' : ''}`} style={{ color: pathname.includes("/dashboard/logs") ? accentColor : '', borderLeftColor: pathname.includes("/dashboard/logs") ? accentColor : 'transparent' }}>
                  <FiFileText />
                  <span>Logi</span>
                </Link>
              </div>

              <div className="nav-section">
                <div className="nav-section-title">ZARZĄDZANIE BOTEM</div>
                <Link href={getLink("/dashboard/bot-settings")} className={`nav-link ${pathname === "/dashboard/bot-settings" ? 'active' : ''}`} style={{ color: pathname === "/dashboard/bot-settings" ? accentColor : '', borderLeftColor: pathname === "/dashboard/bot-settings" ? accentColor : 'transparent' }}>
                  <FiActivity />
                  <span>Health & Status</span>
                </Link>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={() => updateTheme({ mode: theme?.mode === 'dark' ? 'light' : 'dark' })}
            className="theme-quick-toggle"
            title={theme?.mode === 'dark' ? 'Przełącz na jasny' : 'Przełącz na ciemny'}
          >
            {theme?.mode === 'dark' ? <FiSun /> : <FiMoon />}
            <span>{theme?.mode === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}</span>
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <FiLogOut />
            <span>Wyloguj</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <img src="/resources/baner-dashboard.png" alt="" className="top-bar-bg" />
          <div className="top-bar-overlay" />
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
              <div className={`status-item ${mongoStatus ? 'online' : 'offline'}`}>
                <FiDatabase />
                <span>{mongoStatus ? 'Połączenie z bazą' : 'Brak połączenia z bazą'}</span>
                {mongoStatus ? <FiCheckCircle /> : <FiXCircle />}
              </div>
            </div>
          </div>
        </header>

        {selectedGuildId && botOnGuild === false ? (
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
          children
        )}
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: #0a0a0f;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .sidebar {
          width: 280px;
          background: #111118;
          border-right: 1px solid #1e1e26;
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
          border-bottom: 1px solid #1e1e26;
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
          color: #6b6b76;
        }

        .server-selector {
          padding: 1rem;
          border-bottom: 1px solid #1e1e26;
          position: relative;
        }

        .server-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b6b76;
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
          background: #0a0a0f;
          border: 1px solid #1e1e26;
          border-radius: var(--border-radius);
          color: #ffffff;
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
          background: #14141c;
          border: 1px solid #1e1e26;
          border-radius: var(--border-radius);
          z-index: 100;
          max-height: 250px;
          overflow-y: auto;
        }

        .dropdown-item {
          width: 100%;
          padding: 0.6rem 0.75rem;
          background: none;
          border: none;
          color: #ffffff;
          text-align: left;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }

        .dropdown-item:hover {
          background: #1e1e26;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 0;
        }

        .nav-section {
          margin-bottom: 0.5rem;
        }

        .nav-section-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b6b76;
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
        }

        .nav-link:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .nav-link.active {
          background: rgba(59, 130, 246, 0.15);
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid #1e1e26;
        }

        .theme-quick-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          background: none;
          border: 1px solid #1e1e26;
          border-radius: var(--border-radius);
          color: var(--accent-color);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
          margin-bottom: 0.5rem;
        }
        .theme-quick-toggle:hover {
          background: rgba(var(--surface-rgb), 0.5);
          border-color: var(--accent-color);
        }
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          background: none;
          border: 1px solid #1e1e26;
          border-radius: var(--border-radius);
          color: #9c9ca7;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: #0a0a0f;
          color: #ffffff;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .top-bar {
          position: relative;
          height: 250px;
          overflow: hidden;
          flex-shrink: 0;
          border-bottom: 1px solid #1e1e26;
        }

        .top-bar-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          min-height: 100%;
          object-fit: cover;
          object-position: top;
        }

        .top-bar-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 15, 0.3) 0%,
            rgba(10, 10, 15, 0.7) 100%
          );
        }

        .top-bar-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 50px 1.5rem 1rem 1.5rem;
          height: 100%;
        }

        .server-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .server-avatar {
          width: 56px;
          height: 56px;
          border-radius: var(--border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.4rem;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .server-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .server-details h2 {
          font-size: 1.3rem;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
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
          border-radius: var(--border-radius);
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
        }

        .warning-content h1 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .warning-content p {
          color: #6b6b76;
          margin-bottom: 1.5rem;
        }

        .add-bot-btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          color: #fff;
          text-decoration: none;
          border-radius: var(--border-radius);
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .add-bot-btn:hover {
          opacity: 0.9;
        }

        .refresh-hint {
          font-size: 0.85rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}