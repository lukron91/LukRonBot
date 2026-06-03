"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function SidebarLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "10px",
        textDecoration: "none",
        color: isActive ? "#fff" : "#99aab5",
        backgroundColor: isActive ? "rgba(88, 101, 242, 0.2)" : "transparent",
        borderLeft: isActive ? "3px solid #5865f2" : "3px solid transparent",
        transition: "all 0.2s",
        fontSize: "14px",
        fontWeight: isActive ? "600" : "400"
      }}
    >
      {children}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [guildId, setGuildId] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const pathname = usePathname();

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
      const sessionData = JSON.parse(localStorage.getItem('session'));
      const found = sessionData.guilds.find(g => g.id === guild);
      if (found) setSelectedGuild(found);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('session');
    window.location.href = '/';
  };

  const selectGuild = (id) => {
    window.location.href = `${pathname}?guild=${id}`;
  };

  const getLink = (path) => guildId ? `${path}?guild=${guildId}` : path;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #1e2029" }}>
          <h1 style={{ fontSize: "20px", margin: 0, color: "#fff", fontWeight: "700" }}>
            <span style={{ color: "#5865f2" }}>Luk</span>Ron Bot
          </h1>
          <p style={{ fontSize: "11px", color: "#6d7280", margin: "4px 0 0 0", textTransform: "uppercase", letterSpacing: "1px" }}>Panel sterowania</p>
        </div>

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

        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <p style={{ fontSize: "11px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px", padding: "0 8px", marginBottom: "8px" }}>Menu</p>
          <SidebarLink href={getLink('/dashboard')}>
             <span>Dashboard</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/config')}>
            ⚙️ <span>Ustawienia</span>
          </SidebarLink>

          <p style={{ fontSize: "11px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px", padding: "0 8px", marginTop: "20px", marginBottom: "8px" }}>Moduły</p>
          <SidebarLink href={getLink('/dashboard/tickets')}>
            🎫 <span>Tickety</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/automod')}>
            🤖 <span>Auto-moderacja</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/welcome')}>
            👋 <span>Powitania</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/logs')}>
             <span>Logi</span>
          </SidebarLink>
          <SidebarLink href={getLink('/dashboard/moderation')}>
            🛡️ <span>Moderacja</span>
          </SidebarLink>
        </nav>

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
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 14px",
              backgroundColor: "#ed4245",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              whiteSpace: "nowrap"
            }}
          >
            🚪 Wyloguj
          </button>
        </div>
      </aside>

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
        {children}
      </main>
    </div>
  );
}
