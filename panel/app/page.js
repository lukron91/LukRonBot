"use client";
import { useEffect } from "react";

export default function Home() {
  // Automatyczny przekierowanie jeśli ktoś jest już zalogowany
  useEffect(() => {
    const session = localStorage.getItem('session');
    if (session) {
      window.location.href = '/dashboard';
    }
  }, []);

  // WAŻNE: Zmień na swoje Client ID z Discord Developer Portal!
  const CLIENT_ID = "1511561628733276280"; 
  
  // Upewnij się, że ten URL jest identyczny jak w ustawieniach OAuth2 w Discord Developer Portal
  const REDIRECT_URI = "https://lukronbot.vercel.app/api/auth/callback"; 
  const SCOPE = "identify guilds";

  const loginUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}`;

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#0f1115", 
      color: "#fff", 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "20px",
      position: "relative"
    }}>
      <h1 style={{ fontSize: "48px", fontWeight: "800", margin: "0 0 16px 0" }}>
        <span style={{ color: "#5865f2" }}>Luk</span>Ron Bot
      </h1>
      <p style={{ fontSize: "18px", color: "#99aab5", margin: "0 0 40px 0", maxWidth: "500px", lineHeight: "1.5" }}>
        Zaawansowany panel zarządzania botem Discord. Konfiguruj moduły, tickety, automoderację i wiele więcej w jednym miejscu.
      </p>
      
      <a 
        href={loginUrl}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 32px",
          backgroundColor: "#5865f2",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "12px",
          fontSize: "16px",
          fontWeight: "600",
          boxShadow: "0 8px 24px rgba(88, 101, 242, 0.4)",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Zaloguj przez Discord
      </a>

      <footer style={{ position: "absolute", bottom: "20px", fontSize: "12px", color: "#6d7280" }}>
        LukRon Bot © 2026. Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
}
