"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';
import { FiLogOut, FiPlusCircle, FiRefreshCw } from 'react-icons/fi';

export default function ServersPage() {
  const { accentColor } = useTheme();
  const router = useRouter();
  const [servers, setServers] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServers = () => {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) {
        router.push("/");
        return;
      }
      try {
        const session = JSON.parse(sessionRaw);
        setServers(session.guilds || []);
      } catch {
        router.push("/");
      }
      setLoading(false);
    };
    loadServers();
  }, [router]);

  const handleManage = (guildId) => {
    router.push(`/dashboard?guild=${guildId}`);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("session");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="servers-loading">Ładowanie...</div>
    );
  }

  return (
    <div className="servers-container">
      <div className="servers-header">
        <h1>Wybierz serwer</h1>
        <button onClick={handleLogout} className="logout-btn-header">
          <FiLogOut />
          <span>Wyloguj</span>
        </button>
      </div>

      <div className="servers-grid">
        {servers.length === 0 ? (
          <div className="no-servers">Nie jesteś administratorem żadnego serwera.</div>
        ) : (
          servers.map((guild) => (
            <div key={guild.id} className="server-card">
              <div className="server-icon">
                {guild.icon ? (
                  <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt="" />
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
                  Zarządzaj
                </button>
                <a
                  href={`https://discord.com/api/oauth2/authorize?client_id=1511561628733276280&permissions=8&scope=bot%20applications.commands`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-add-bot"
                >
                  <FiPlusCircle /> Dodaj bota
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Potwierdź wylogowanie">
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Czy na pewno chcesz się wylogować?
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowLogoutModal(false)} className="btn-base btn-standard" style={{ background: 'var(--border-color)', boxShadow: 'none' }}>Anuluj</button>
          <button onClick={confirmLogout} className="btn-base btn-danger">Wyloguj się</button>
        </div>
      </Modal>

      <style jsx>{`
        .servers-container {
          min-height: 100vh;
          background: var(--bg-color, #0a0a0f);
          padding: 2rem;
          color: var(--text-color, #e1e1e6);
        }
        .servers-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color, #1e1e24);
          padding-bottom: 1rem;
        }
        .servers-header h1 {
          color: var(--text-color, #e1e1e6);
          font-size: 1.8rem;
          margin: 0;
        }
        .logout-btn-header {
          background: var(--bg-color, #1e1e26);
          border: 1px solid var(--border-color, #2a2a30);
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius, 12px);
          color: var(--text-color, #e1e1e6);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .logout-btn-header:hover {
          background: var(--border-color, #2a2a34);
        }
        .servers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .server-card {
          background: rgba(var(--surface-rgb, 20, 20, 28), var(--surface-opacity, 0.9));
          border-radius: var(--border-radius, 12px);
          padding: 1.2rem;
          border: 1px solid var(--border-color, #25252d);
          transition: all 0.2s;
        }
        .server-card:hover {
          border-color: var(--accent-color, #5865f2);
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
          background: var(--accent-color, #5865f2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: bold;
          color: white;
        }
        .server-info h3 {
          color: var(--text-color, #e1e1e6);
          margin: 0 0 0.25rem;
        }
        .server-info p {
          color: var(--text-muted, #8b8ba0);
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
          border-radius: var(--border-radius, 12px);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          flex: 1;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .btn-manage {
          background: var(--accent-color, #5865f2);
          color: white;
          border: none;
        }
        .btn-manage:hover {
          opacity: 0.85;
        }
        .btn-add-bot {
          background: var(--bg-color, #1e1e26);
          color: var(--text-color, #e1e1e6);
          border: 1px solid var(--border-color, #2a2a30);
        }
        .btn-add-bot:hover {
          background: var(--border-color, #2a2a34);
        }
        .no-servers {
          color: var(--text-muted, #8b8ba0);
          text-align: center;
          grid-column: 1 / -1;
          padding: 2rem;
        }
        .servers-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-color, #e1e1e6);
          background: var(--bg-color, #0a0a0f);
        }
      `}</style>
    </div>
  );
}
