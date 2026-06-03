"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export default function Providers({ children }) {
  useEffect(() => {
    // Przechwytuj kliknięcia w linki Discord OAuth2 i otwieraj w aplikacji Discord
    const handleDiscordLinks = (e) => {
      const target = e.target.closest('a[href*="discord.com/api/oauth2"]');
      if (target) {
        e.preventDefault();
        const url = target.href;
        // Zamień https://discord.com/ na discord:// aby otworzyć w aplikacji
        const discordUrl = url.replace('https://discord.com/', 'discord://');
        window.location.href = discordUrl;
      }
    };
    document.addEventListener('click', handleDiscordLinks);
    return () => document.removeEventListener('click', handleDiscordLinks);
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
