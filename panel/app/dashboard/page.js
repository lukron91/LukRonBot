"use client";
import { Suspense, useEffect, useState } from "react";

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem('session');
    
    if (!session) {
      window.location.href = '/';
      return;
    }

    try {
      const data = JSON.parse(session);
      setUser(data);
      setGuilds(data.guilds || []);
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
        <h2 style={{ fontSize: "28px", marginBottom: "24px", color: "#fff" }}>Twoje serwery</h2>
        
        {guilds.length === 0 ? (
          <div style={{ 
            backgroundColor: "#23272a", 
            padding: "48px", 
            borderRadius: "12px", 
            textAlign: "center",
            color: "#99aab5"
          }}>
            <p style={{ fontSize: "18px", marginBottom: "16px" }}>Nie znaleziono żadnych serwerów</p>
            <p>Sprawdź czy bot jest na Twoich serwerach i masz uprawnienia administratora</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {guilds.map((guild) => (
              <div
                key={guild.id}
                style={{
                  backgroundColor: "#23272a",
                  padding: "24px",
                  borderRadius: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "2px solid #2c2f33",
                  transition: "border-color 0.2s",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#5865f2"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2c2f33"}
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
                    <p style={{ color: "#99aab5", fontSize: "14px" }}>ID: {guild.id}</p>
                  </div>
                </div>

                <a
                  href={`/dashboard/config?guild=${guild.id}`}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#5865f2",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "16px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#4752c4"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#5865f2"}
                >
                  ⚙️ Konfiguracja
                </a>
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
