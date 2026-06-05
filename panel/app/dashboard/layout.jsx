"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  FiArrowLeft, FiGrid, FiSettings, FiMessageSquare, FiShield, 
  FiUserPlus, FiFileText, FiActivity, FiLogOut, FiServer, 
  FiDatabase, FiCheckCircle, FiXCircle 
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sprawdzanie statusów (co 15 sekund)
  useEffect(() => {
    const checkStatuses = async () => {
      // Client aktywny (bot Discord)
      try {
        const healthRes = await fetch("http://localhost:3001/bot/health");
        const data = await healthRes.json();
        setClientActive(data.running === true);
      } catch {
        setClientActive(false);
      }
      // Server aktywny (API bota)
      try {
        const statusRes = await fetch("http://localhost:3001/api/status");
        setServerActive(statusRes.ok);
      } catch {
        setServerActive(false);
      }
      // Połączenie z bazą
      try {
        const statusRes = await fetch("http://localhost:3001/api/status");
        const data = await statusRes.json();
        setMongoStatus(data.mongo === true);
      } catch {
        setMongoStatus(false);
      }
    };
    checkStatuses();
    const interval = setInterval(checkStatuses, 15000);
    return () => clearInterval(interval);
  }, []);

  // Pobranie sesji i serwerów
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

  // Sprawdzenie czy bot jest na wybranym serwerze
  useEffect(() => {
    if (!selectedGuildId) {
      setBotOnGuild(null);
      return;
    }
    const checkBot = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/guilds/${selectedGuildId}/stats`);
        setBotOnGuild(res.ok);
      } catch {
        setBotOnGuild(false);
      }
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
    router.push(`${pathname}?guild=${guildId}`);
  };

  const getLink = (path) => (selectedGuildId ? `${path}?guild=${selectedGuildId}` : path);
  const isActive = (path) => pathname === path;

  if (!user) return null;
  const selectedGuild = guilds.find(g => g.id === selectedGuildId);
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1511561628733276280";

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>LukRon Bot</h1>
          <p>Panel sterowania</p>
        </div>
        <div className="sidebar-guild-select">
          <label>Serwer</label>
          <select value={selectedGuildId || ""} onChange={(e) => selectGuild(e.target.value)}>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <nav className="sidebar-nav">
          <Link href="/servers" className="nav-link" style={{ marginBottom: "0.5rem", borderBottom: "1px solid #2a2a30" }}>
            <FiArrowLeft /> Wszystkie serwery
          </Link>
          <div className="nav-category">Ogólne</div>
          <Link href={getLink("/dashboard")} className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}>
            <FiGrid /> Przegląd
          </Link>
          <Link href={getLink("/dashboard/config")} className={`nav-link ${isActive("/dashboard/config") ? "active" : ""}`}>
            <FiSettings /> Konfiguracja
          </Link>
          <div className="nav-category">Moderacja</div>
          <Link href={getLink("/dashboard/moderation/users")} className={`nav-link ${isActive("/dashboard/moderation/users") ? "active" : ""}`}>
            <FiUserPlus /> Lista użytkowników
          </Link>
          <Link href={getLink("/dashboard/moderation/settings")} className={`nav-link ${isActive("/dashboard/moderation/settings") ? "active" : ""}`}>
            <FiShield /> Ustawienia moderacji
          </Link>
          <div className="nav-category">Tickety</div>
          <Link href={getLink("/dashboard/tickets")} className={`nav-link ${isActive("/dashboard/tickets") ? "active" : ""}`}>
            <FiMessageSquare /> Tickety
          </Link>
          <div className="nav-category">Auto-mod</div>
          <Link href={getLink("/dashboard/automod")} className={`nav-link ${isActive("/dashboard/automod") ? "active" : ""}`}>
            <FiShield /> Automod
          </Link>
          <div className="nav-category">Powitania</div>
          <Link href={getLink("/dashboard/welcome")} className={`nav-link ${isActive("/dashboard/welcome") ? "active" : ""}`}>
            <FiUserPlus /> Powitania
          </Link>
          <div className="nav-category">Logi</div>
          <Link href={getLink("/dashboard/logs")} className={`nav-link ${isActive("/dashboard/logs") ? "active" : ""}`}>
            <FiFileText /> Logi
          </Link>
          {isOwner && (
            <>
              <div className="nav-category">Zarządzanie botem</div>
              <Link href={getLink("/dashboard/bot-settings")} className={`nav-link ${isActive("/dashboard/bot-settings") ? "active" : ""}`}>
                <FiActivity /> Health & Status
              </Link>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          {user?.avatar && <img src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`} alt="avatar" className="avatar" />}
          <div className="user-info">
            <div className="username">{user?.username}</div>
            <div className="status">Zalogowany</div>
          </div>
          <button onClick={handleLogout} className="logout-btn"><FiLogOut /> Wyloguj</button>
        </div>
      </aside>
      <main className="main-content">
        <div className="dashboard-header">
          <div className="guild-info">
            {selectedGuild && (
              <>
                {selectedGuild.icon ? (
                  <img src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`} className="guild-icon" />
                ) : (
                  <div className="guild-icon">{selectedGuild.name.charAt(0).toUpperCase()}</div>
                )}
                <div>
                  <div className="guild-name">{selectedGuild.name}</div>
                  <div className="guild-id">ID: {selectedGuild.id}</div>
                </div>
              </>
            )}
          </div>
          <div className="status-group-vertical">
            <div className={`status-item ${clientActive ? 'active' : 'inactive'}`}>
              <FiServer className="status-icon" />
              <span className="status-text">{clientActive ? 'Client aktywny' : 'Client nieaktywny'}</span>
              {clientActive ? <FiCheckCircle className="status-check" /> : <FiXCircle className="status-check" />}
            </div>
            <div className={`status-item ${serverActive ? 'active' : 'inactive'}`}>
              <FiActivity className="status-icon" />
              <span className="status-text">{serverActive ? 'Server aktywny' : 'Server nieaktywny'}</span>
              {serverActive ? <FiCheckCircle className="status-check" /> : <FiXCircle className="status-check" />}
            </div>
            <div className={`status-item ${mongoStatus ? 'active' : 'inactive'}`}>
              <FiDatabase className="status-icon" />
              <span className="status-text">{mongoStatus ? 'Połączenie z bazą aktywne' : 'Brak połączenia z bazą'}</span>
              {mongoStatus ? <FiCheckCircle className="status-check" /> : <FiXCircle className="status-check" />}
            </div>
          </div>
        </div>
        {selectedGuildId && botOnGuild === false ? (
          <div className="bot-missing-card">
            <div className="bot-missing-icon">🤖</div>
            <h2>Bot nie jest dodany do tego serwera</h2>
            <p>Aby korzystać z panelu, dodaj bota do serwera {selectedGuild?.name}.</p>
            <a
              href={`https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${selectedGuildId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="add-bot-btn"
            >
              ➕ Dodaj bota do serwera
            </a>
            <p className="bot-missing-hint">Po dodaniu bota odśwież stronę (F5).</p>
          </div>
        ) : (
          children
        )}
      </main>

      <style jsx>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #1e1e24;
        }
        .guild-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .guild-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #5865f2, #4752c4);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
        }
        .guild-name {
          font-size: 1.5rem;
          font-weight: 600;
        }
        .guild-id {
          font-size: 0.75rem;
          color: #6b6b76;
        }
        .status-group-vertical {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #1a1a22;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid #2a2a30;
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .status-item.active {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.4);
        }
        .status-item.inactive {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .status-icon {
          width: 18px;
          height: 18px;
        }
        .status-item.active .status-icon { color: #4ade80; }
        .status-item.inactive .status-icon { color: #f87171; }
        .status-text {
          flex: 1;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .status-item.active .status-text { color: #4ade80; }
        .status-item.inactive .status-text { color: #f87171; }
        .status-check {
          width: 16px;
          height: 16px;
        }
        .status-item.active .status-check { color: #4ade80; }
        .status-item.inactive .status-check { color: #f87171; }
      `}</style>
    </div>
  );
}