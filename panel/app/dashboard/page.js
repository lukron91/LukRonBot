"use client";
import { Suspense, useEffect, useState } from "react";

// Sprawdź czy użytkownik ma uprawnienia do zarządzania serwerem
const canManageGuild = (guild) => {
  const perms = guild.permissions_new 
    ? BigInt(guild.permissions_new) 
    : BigInt(guild.permissions || 0);
  const ADMINISTRATOR = 0x8n;
  const MANAGE_GUILD = 0x20n;
  return (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n;
};

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [manageableGuilds, setManageableGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Zamień na ID swojego bota z Discord Developer Portal
  const BOT_CLIENT_ID = "1401384199558140025";

  const getBotInviteUrl = () => {
    const permissions = 8; // Administrator
    return `https://discord.com/api/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=${permissions}&scope=bot%20applications.commands`;
  };

  useEffect(() => {
    const session = localStorage.getItem('session');
    
    if (!session) {
      window.location.href = '/';
      return;
    }

    try {
      const data = JSON.parse(session);
      setUser(data);
      
      // Filtruj tylko serwery gdzie użytkownik ma uprawnienia
      const allGuilds = data.guilds || [];
      const manageable = allGuilds.filter(canManageGuild);
      setManageableGuilds(manageable);
      setLoading(false);
    } catch (err) {
      console.error('Session parse error:', err);
      localStorage.removeItem('session');
      window.location.href = '/';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('session');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}>
        <p>Ładowanie dashboardu...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ backgroundColor: "#1a1d20", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#23272a", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2c2f33" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: "24px", color: "#5865f2", margin: 0 }}>LukRon Bot</h1>
          <span style={{ color: "#99aab5" }}>Panel zarządzania</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {user.avatar && (
              <img 
                src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`}
                alt={user.username}
                style={{ width: "32px", height: "32px", borderRadius: "50%" }}
              />
            )}
            <span style={{ color: "#fff", fontWeight: "500" }}>{user.username}</span>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ed4245",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Wyloguj
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "28px", color: "#fff", margin: 0 }}>
            Twoje serwery ({manageableGuilds.length})
          </h2>
          <a
            href={getBotInviteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "12px 24px",
              backgroundColor: "#5865f2",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            ➕ Dodaj bota na nowy serwer
          </a>
        </div>
        
        {manageableGuilds.length === 0 ? (
          <div style={{ 
            backgroundColor: "#23272a", 
            padding: "48px", 
            borderRadius: "12px", 
            textAlign: "center",
            color: "#99aab5"
          }}>
            <p style={{ fontSize: "18px", marginBottom: "16px" }}>Nie masz serwerów z uprawnieniami</p>
            <p>Nie jesteś właścicielem ani administratorem żadnego serwera Discord</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {manageableGuilds.map((guild) => (
              <div
                key={guild.id}
                style={{
                  backgroundColor: "#23272a",
                  padding: "24px",
                  borderRadius: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "2px solid #2c2f33"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      style={{ width: "64px", height: "64px", borderRadius: "12px" }}
                    />
                  ) : (
                    <div style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "12px",
                      backgroundColor: "#5865f2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      fontWeight: "bold"
                    }}>
                      {guild.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div>
                    <h3 style={{ fontSize: "20px", marginBottom: "4px", color: "#fff" }}>{guild.name}</h3>
                    <p style={{ color: "#99aab5", fontSize: "14px", margin: 0 }}>ID: {guild.id}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <a
                    href={getBotInviteUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#5865f2",
                      color: "#fff",
                      textDecoration: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "14px"
                    }}
                  >
                    ➕ Dodaj bota
                  </a>
                  <a
                    href={`/dashboard/config?guild=${guild.id}`}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#23a559",
                      color: "#fff",
                      textDecoration: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "14px"
                    }}
                  >
                    ⚙️ Konfiguracja
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: "#23272a", 
        padding: "24px", 
        textAlign: "center", 
        color: "#99aab5",
        marginTop: "48px",
        borderTop: "2px solid #2c2f33"
      }}>
        <p>LukRon Bot Panel © 2026</p>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}><p>Ładowanie...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}
