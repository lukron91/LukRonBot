"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Sprawdź czy jest sesja
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const session = getCookie('session');
    if (session) {
      window.location.href = '/dashboard';
    }
  }, []);

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URI);
  const discordAuthUrl = `discord://-/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh",
      backgroundColor: "#1a1d20"
    }}>
      <h1 style={{ fontSize: "3rem", color: "#5865F2", marginBottom: "1rem" }}>🤖 LukRon Bot</h1>
      <p style={{ color: "#99aab5", marginBottom: "2rem" }}>Zaloguj się, aby zarządzać botem</p>
      <a 
        href={discordAuthUrl}
        style={{ 
          backgroundColor: "#5865F2", 
          color: "white", 
          padding: "12px 24px", 
          borderRadius: "6px", 
          fontWeight: "bold", 
          textDecoration: "none",
          fontSize: "16px"
        }}
      >
        Zaloguj przez Discord
      </a>
    </div>
  );
}
