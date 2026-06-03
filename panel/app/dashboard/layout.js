"use client";
import { Suspense, useEffect, useState } from "react";

function SidebarLink({ href, active, children }) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "10px",
        textDecoration: "none",
        color: active ? "#fff" : "#99aab5",
        backgroundColor: active ? "rgba(88, 101, 242, 0.2)" : "transparent",
        borderLeft: active ? "3px solid #5865f2" : "3px solid transparent",
        transition: "all 0.2s",
        fontSize: "14px",
        fontWeight: active ? "600" : "400"
      }}
    >
      {children}
    </a>
  );
}

function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [guildId, setGuildId] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('session');
    if (!session) {
      window.location.href = '/';
      return;
    }
    try {
      const data = JSON.parse(session);
      setUser(data);
      const manageable = (data.guilds || []).filter(g => {
        const perms = BigInt(g.permissions_new || g.permissions || 0);
        return (perms & 0x8n) !== 0n || (perms & 0x20n) !== 0n;
      });
      setGuilds(manageable);
    } catch (err) {
      window.location.href = '/';
    }

    const params = new URLSearchParams(window.location.search);
    const guild = params.get('guild');
    if (guild) {
      setGuildId(guild);
      // Znajdź serwer
      const session = JSON.parse(localStorage.getItem('session'));
      const found = session.guilds.find(g => g.id === guild);
      if (found) setSelectedGuild(found);
    } else if (guilds.length > 0) {
      window.location.href = `/dashboard?guild=${guilds[0].id}`;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('session');
    window.location.href = '/';
  };

  const selectGuild = (id) => {
    window.location.href = `/dashboard?guild=${id}`;
  };

  const getLink = (path) => guildId ? `${path}?guild=${guildId}` : path;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{ 
        width: "260px", 
        backgroundColor: "#16181d", 
        borderRight: "1px solid #1e2029",
        display: "flex", 
        flexDirection: "column",
        position: "fixed",
        height: "100vh",
        overflow: "hidden"
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #1e2029" }}>
          <h1 style={{ fontSize: "20px", margin: 0, color: "#fff", fontWeight: "700" }}>
            <span style={{ color: "#5865f2" }}>Luk</span>Ron Bot
          </h1>
          <p style={{ fontSize: "11px", color: "#6d7280", margin: "4px 0 0 0", textTransform: "uppercase", letterSpacing: "1px" }}>Panel sterowania</p>
        </div>

        {/* Wybór serwera */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2029" }}>
          <label style={{ fontSize: "11px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>Serwer</label>
          <select
            value={guildId || ''}
            onChange={(e) => selectGuild(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#1e2029",
              border: "1px solid #2d3139",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {guilds.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Nawigacja */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <p style={{ fontSize: "11px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px", padding: "0 8px", marginBottom: "8px" }}>Menu</p>
          <SidebarLink href={getLink('/dashboard')} active={currentPath === '/dashboard'}>
            📊 <span>Dashboard</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/config')} active={currentPath === '/dashboard/config'}>
            ️ <span>Ustawienia</span>
          </SidebarLink>

          <p style={{ fontSize: "11px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px", padding: "0 8px", marginTop: "20px", marginBottom: "8px" }}>Moduły</p>
          <SidebarLink href={getLink('/dashboard/tickets')} active={currentPath === '/dashboard/tickets'}>
            🎫 <span>Ticket</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/automod')} active={currentPath === '/dashboard/automod'}>
            🤖 <span>Auto-moderacja</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/welcome')} active={currentPath === '/dashboard/welcome'}>
            👋 <span>Powitania</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/logs')} active={currentPath === '/dashboard/logs'}>
            📝 <span>Logi</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/moderation')} active={currentPath === '/dashboard/moderation'}>
            🛡️ <span>Moderacja</span>
          </SidebarLink>
        </nav>

        {/* Profil */}
        <div style={{ padding: "16px", borderTop: "1px solid #1e2029", display: "flex", alignItems: "center", gap: "12px" }}>
          {user?.avatar && (
            <img 
              src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`}
              style={{ width: "36px", height: "36px", borderRadius: "50%" }}
            />
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#6d7280" }}>Online</p>
          </div>
          <button onClick={handleLogout} title="Wyloguj" style={{
            background: "none",
            border: "none",
            color: "#6d7280",
            cursor: "pointer",
            fontSize: "16px",
            padding: "4px"
          }}>🚪</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ marginLeft: "260px", flex: 1, padding: "32px 40px" }}>
        {selectedGuild && (
          <div style={{ 
            marginBottom: "24px", 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            padding: "16px 20px",
            backgroundColor: "#16181d",
            borderRadius: "12px",
            border: "1px solid #1e2029"
          }}>
            {selectedGuild.icon ? (
              <img src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`} style={{ width: "40px", height: "40px", borderRadius: "10px" }} />
            ) : (
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #5865f2, #7c8aff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>
                {selectedGuild.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>{selectedGuild.name}</h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6d7280" }}>ID: {selectedGuild.id}</p>
            </div>
          </div>
        )}
        <Suspense fallback={<div style={{ color: "#6d7280" }}>Ładowanie...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default DashboardLayout;
