"use client";
import { useEffect, useState } from "react";

export default function DashboardHome() {
  const [stats, setStats] = useState({
    commandsUsed: 0,
    ticketsCreated: 0,
    messagesModerated: 0,
    usersProtected: 0
  });

  useEffect(() => {
    // Tutaj później pobierzemy dane z API
    setStats({
      commandsUsed: 1247,
      ticketsCreated: 38,
      messagesModerated: 156,
      usersProtected: 412
    });
  }, []);

  const cards = [
    { label: "Użyte komendy", value: stats.commandsUsed, icon: "", color: "#5865f2" },
    { label: "Utworzone tickety", value: stats.ticketsCreated, icon: "🎫", color: "#23a559" },
    { label: "Zmoderowane wiadomości", value: stats.messagesModerated, icon: "", color: "#faa61a" },
    { label: "Chronieni użytkownicy", value: stats.usersProtected, icon: "️", color: "#ed4245" }
  ];

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", margin: "0 0 8px 0", fontWeight: "700" }}>Witaj w panelu 👋</h1>
        <p style={{ color: "#6d7280", margin: 0, fontSize: "14px" }}>Oto przegląd Twojego bota</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            backgroundColor: "#16181d",
            border: "1px solid #1e2029",
            borderRadius: "16px",
            padding: "24px",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ 
              position: "absolute", 
              top: "-20px", 
              right: "-20px", 
              width: "80px", 
              height: "80px", 
              borderRadius: "50%", 
              backgroundColor: card.color, 
              opacity: 0.1 
            }} />
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>{card.icon}</div>
            <p style={{ margin: 0, fontSize: "12px", color: "#6d7280", textTransform: "uppercase", letterSpacing: "1px" }}>{card.label}</p>
            <p style={{ margin: "4px 0 0 0", fontSize: "32px", fontWeight: "700", color: "#fff" }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}> Aktywność</h3>
          <p style={{ color: "#6d7280", fontSize: "13px" }}>Tu będą wykresy aktywności bota w kolejnej aktualizacji</p>
        </div>
        <div style={{ backgroundColor: "#16181d", border: "1px solid #1e2029", borderRadius: "16px", padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>⚡ Szybkie akcje</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <a href="/dashboard/config" style={{ padding: "10px", backgroundColor: "#1e2029", borderRadius: "8px", textDecoration: "none", color: "#fff", fontSize: "13px" }}>⚙️ Ustawienia ogólne</a>
            <a href="/dashboard/tickets" style={{ padding: "10px", backgroundColor: "#1e2029", borderRadius: "8px", textDecoration: "none", color: "#fff", fontSize: "13px" }}>🎫 Konfiguruj tickety</a>
          </div>
        </div>
      </div>
    </div>
  );
}
