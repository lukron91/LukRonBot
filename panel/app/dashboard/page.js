"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.hash) {
      try {
        const sessionData = decodeURIComponent(atob(window.location.hash.substring(1)));
        const data = JSON.parse(sessionData);
        
        localStorage.setItem('session', JSON.stringify(data));
        window.history.replaceState({}, document.title, '/dashboard');
        
        const manageableGuilds = data.guilds.filter(g => (BigInt(g.permissions) & 0x20n) === 0x20n);
        setUserData({ ...data, guilds: manageableGuilds });
        setLoading(false);
      } catch (error) {
        console.error('Session parse error:', error);
        window.location.href = '/';
      }
    } else {
      try {
        const stored = localStorage.getItem('session');
        if (stored) {
          const data = JSON.parse(stored);
          const manageableGuilds = data.guilds.filter(g => (BigInt(g.permissions) & 0x20n) === 0x20n);
          setUserData({ ...data, guilds: manageableGuilds });
          setLoading(false);
        } else {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Local storage error:', error);
        window.location.href = '/';
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('session');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}>
        <p>Ładowanie...</p>
      </div>
    );
  }

  const userAvatar = userData.avatar 
    ? `https://cdn.discordapp.com/avatars/${userData.userId}/${userData.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  return (
    <div style={{ backgroundColor: "#1a1d20", minHeight: "100vh", color: "#fff" }}>
      <header style={{ backgroundColor: "#23272a", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2c2f33" }}>
        <h1 style={{ color: "#5865f2", fontSize: "20px", margin: 0 }}> LukRon Bot</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img 
              src={userAvatar}
              alt="Avatar" 
              style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #5865f2" }}
            />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>{userData.username}</div>
              <div style={{ fontSize: "12px", color: "#99aab5" }}>{userData.email || "Brak emaila"}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              backgroundColor: "#ed4245", 
              color: "white", 
              padding: "8px 16px", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            Wyloguj
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "24px" }}>Twoje serwery</h2>
        
        {userData.guilds.length === 0 ? (
          <div style={{ backgroundColor: "#23272a", padding: "32px", borderRadius: "12px", textAlign: "center" }}>
            <p style={{ color: "#99aab5" }}>Nie masz żadnych serwerów z uprawnieniami zarządcy.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {userData.guilds.map((guild) => {
              const iconUrl = guild.icon 
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : `https://cdn.discordapp.com/embed/avatars/${(guild.id >> 22) % 6}.png`;
              
              return (
                <div key={guild.id} style={{ backgroundColor: "#23272a", padding: "1.5rem", borderRadius: "12px", border: "1px solid #2c2f33" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
                    <img 
                      src={iconUrl}
                      alt={guild.name} 
                      style={{ width: "48px", height: "48px", borderRadius: "50%" }}
                    />
                    <h4 style={{ margin: 0, fontSize: "16px", flex: 1 }}>{guild.name}</h4>
                  </div>
                  <a
                    href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      display: "block", 
                      textAlign: "center",
                      backgroundColor: "#23a559", 
                      color: "white", 
                      padding: "10px 16px", 
                      borderRadius: "6px", 
                      fontWeight: "bold", 
                      fontSize: "14px",
                      textDecoration: "none"
                    }}
                  >
                    Dodaj bota
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
