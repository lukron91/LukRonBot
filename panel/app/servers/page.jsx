"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut, FiSettings, FiPlusCircle } from 'react-icons/fi';

export default function ServersPage() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const sessionRaw = localStorage.getItem("session");
    if (!sessionRaw) {
      router.push("/");
      return;
    }
    try {
      const session = JSON.parse(sessionRaw);
      setUser(session);
      setGuilds(session.guilds || []);
    } catch (err) {
      console.error(err);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    if (window.confirm("Czy na pewno chcesz się wylogować?")) {
      localStorage.removeItem("session");
      router.push("/");
    }
  };

  const handleManage = (guildId) => {
    router.push(`/dashboard?guild=${guildId}`);
  };

  if (loading) return <div className="servers-loading">Ładowanie listy serwerów...</div>;

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1511561628733276280";

  return (
    <div className="servers-container">
      <div className="servers-header">
        <h1>Wybierz serwer</h1>
        <button onClick={handleLogout} className="logout-btn-header">
          <FiLogOut /> Wyloguj
        </button>
      </div>
      <div className="servers-grid">
        {guilds.length === 0 && (
          <div className="no-servers">Nie zarządzasz żadnym serwerem.</div>
        )}
        {guilds.map(guild => (
          <div key={guild.id} className="server-card">
            <div className="server-icon">
              {guild.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt={guild.name} />
              ) : (
                <div className="server-icon-placeholder">{guild.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="server-info">
              <h3>{guild.name}</h3>
              <p>ID: {guild.id}</p>
            </div>
            <div className="server-actions">
              <button onClick={() => handleManage(guild.id)} className="btn-manage">
                <FiSettings /> Zarządzaj
              </button>
              <a
                href={`https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-add-bot"
              >
                <FiPlusCircle /> Dodaj bota
              </a>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .servers-container {
          min-height: 100vh;
          background: #0a0a0f;
          padding: 2rem;
        }
        .servers-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid #1e1e24;
          padding-bottom: 1rem;
        }
        .servers-header h1 {
          color: #e1e1e6;
          font-size: 1.8rem;
        }
        .logout-btn-header {
          background: #1e1e26;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          color: #e1e1e6;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .servers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .server-card {
          background: #14141c;
          border-radius: 1rem;
          padding: 1.2rem;
          border: 1px solid #25252d;
          transition: all 0.2s;
        }
        .server-card:hover {
          border-color: #5865f2;
          transform: translateY(-2px);
        }
        .server-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .server-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .server-icon-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #5865f2, #4752c4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: bold;
          color: white;
        }
        .server-info h3 {
          color: #e1e1e6;
          margin: 0 0 0.25rem;
        }
        .server-info p {
          color: #8b8ba0;
          font-size: 0.7rem;
        }
        .server-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .btn-manage, .btn-add-bot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          flex: 1;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .btn-manage {
          background: #5865f2;
          color: white;
          border: none;
        }
        .btn-manage:hover {
          background: #4752c4;
        }
        .btn-add-bot {
          background: #1e1e26;
          color: #e1e1e6;
          border: 1px solid #2a2a30;
        }
        .btn-add-bot:hover {
          background: #2a2a34;
        }
        .no-servers {
          color: #8b8ba0;
          text-align: center;
          grid-column: 1 / -1;
          padding: 2rem;
        }
        .servers-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e1e1e6;
        }
      `}</style>
    </div>
  );
}