"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await signIn("discord", { callbackUrl: "/dashboard" });
  };

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
      <button 
        onClick={handleLogin}
        disabled={loading}
        style={{ 
          backgroundColor: "#5865F2", 
          color: "white", 
          padding: "12px 24px", 
          borderRadius: "6px", 
          fontWeight: "bold", 
          cursor: loading ? "not-allowed" : "pointer",
          border: "none",
          fontSize: "16px"
        }}
      >
        {loading ? "Logowanie..." : "Zaloguj przez Discord"}
      </button>
    </div>
  );
}
