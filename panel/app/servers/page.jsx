"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';
import { FiLogOut, FiPlusCircle, FiSettings } from 'react-icons/fi';

export default function ServersPage() {
  const { accentColor } = useTheme();
  const router = useRouter();
  const [servers, setServers] = useState([]);
  const [user, setUser] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionRaw = localStorage.getItem("session");
    if (!sessionRaw) { router.push("/"); return; }
    try {
      const session = JSON.parse(sessionRaw);
      setServers(session.guilds || []);
      setUser(session);
    } catch {
      router.push("/");
    }
    setLoading(false);
  }, [router]);

  const confirmLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem("session");
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
      Ładowanie...
    </div>
  );

  return (
    <div className="sp-root">

      {/* Baner — ten sam co dashboard */}
      <div className="sp-banner">
        <img src="/resources/baner-dashboard.png" alt="" className="sp-banner-img" />
        <div className="sp-banner-overlay" />
        <div className="sp-banner-content">
          <div className="sp-logo-row">
            <img src="/resources/logo.png" alt="LukRon Bot" className="sp-logo" />
            <span className="sp-title" style={{ color: accentColor }}>LukRon Bot</span>
          </div>
          <p className="sp-subtitle">Panel sterowania</p>
        </div>
      </div>

      {/* Okno — wyśrodkowane, czarne tło */}
      <div className="sp-window-wrap">
        <div className="sp-window">

          {/* Nagłówek okna */}
          <div className="sp-window-header">
            <div>
              <h2 className="sp-window-title">Wybierz serwer</h2>
              <p className="sp-window-sub">Zarządzaj serwerami, do których masz dostęp</p>
            </div>
            {user && (
              <div className="sp-user">
                {user.avatar
                  ? <img src={'https://cdn.discordapp.com/avatars/' + user.userId + '/' + user.avatar + '.png'} alt="" className="sp-user-avatar" />
                  : <div className="sp-user-placeholder">{user.username?.[0]?.toUpperCase()}</div>
                }
                <span className="sp-user-name">{user.username}</span>
              </div>
            )}
          </div>

          {/* Lista serwerów */}
          <div className="sp-list">
            {servers.length === 0 ? (
              <div className="sp-empty">
                Nie jesteś administratorem żadnego serwera Discord.<br />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                  Musisz mieć uprawnienia Administratora lub Zarządzaj serwerem.
                </span>
              </div>
            ) : (
              servers.map(guild => (
                <div key={guild.id} className="sp-server-row">
                  <div className="sp-server-icon">
                    {guild.icon
                      ? <img src={'https://cdn.discordapp.com/icons/' + guild.id + '/' + guild.icon + '.png'} alt="" />
                      : <div className="sp-server-placeholder">{guild.name.charAt(0).toUpperCase()}</div>
                    }
                  </div>
                  <div className="sp-server-info">
                    <span className="sp-server-name">{guild.name}</span>
                    <span className="sp-server-id">ID: {guild.id}</span>
                  </div>
                  <div className="btn-row">
                    <a
                      href={'https://discord.com/api/oauth2/authorize?client_id=1511561628733276280&permissions=8&scope=bot%20applications.commands&guild_id=' + guild.id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-base btn-standard sp-btn-add"
                    >
                      <FiPlusCircle /> Dodaj bota
                    </a>
                    <button
                      onClick={() => router.push('/dashboard?guild=' + guild.id)}
                      className="btn-base btn-success"
                    >
                      <FiSettings /> Zarządzaj
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stopka okna — wylogowanie */}
          <div className="sp-window-footer">
            <span className="sp-footer-hint">Zalogowany przez Discord OAuth2</span>
            <button className="btn-base btn-danger" onClick={() => setShowLogoutModal(true)}>
              <FiLogOut /> Wyloguj się
            </button>
          </div>
        </div>
      </div>

      {/* Modal wylogowania */}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Potwierdź wylogowanie" width="380px">
        <div className="modal-tab-content">
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Czy na pewno chcesz się wylogować?
          </p>
          <div className="btn-row-end">
            <button className="btn-base btn-standard" onClick={() => setShowLogoutModal(false)}>Anuluj</button>
            <button className="btn-base btn-danger" onClick={confirmLogout}>Wyloguj się</button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .sp-root {
          min-height: 100vh;
          background: var(--bg-color);
          display: flex;
          flex-direction: column;
        }

        /* Baner */
        .sp-banner {
          position: relative;
          height: 200px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .sp-banner-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .sp-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 75%, var(--bg-color) 100%);
        }
        .sp-banner-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1.25rem 2rem;
        }
        .sp-logo-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sp-logo {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          object-fit: contain;
        }
        .sp-title {
          font-size: 1.4rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .sp-subtitle {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
          margin: 0.1rem 0 0 0;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }

        /* Okno */
        .sp-window-wrap {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2rem 1rem 3rem;
        }
        .sp-window {
          width: 100%;
          max-width: 680px;
          background: #000;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        }

        /* Header okna */
        .sp-window-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 1.5rem 1rem;
          border-bottom: 1px solid var(--border-color);
          gap: 1rem;
        }
        .sp-window-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 0.2rem;
        }
        .sp-window-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }
        .sp-user {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-shrink: 0;
        }
        .sp-user-avatar, .sp-user-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        .sp-user-placeholder {
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
          font-size: 0.85rem;
        }
        .sp-user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* Lista */
        .sp-list {
          max-height: 420px;
          overflow-y: auto;
        }
        .sp-empty {
          padding: 3rem 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .sp-server-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.15s;
        }
        .sp-server-row:last-child {
          border-bottom: none;
        }
        .sp-server-row:hover {
          background: rgba(var(--surface-rgb), 0.2);
        }
        .sp-server-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sp-server-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sp-server-placeholder {
          width: 100%;
          height: 100%;
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
        }
        .sp-server-info {
          flex: 1;
          min-width: 0;
        }
        .sp-server-name {
          display: block;
          font-weight: 600;
          color: var(--text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9rem;
        }
        .sp-server-id {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .sp-btn-add {
          font-size: 0.8rem !important;
        }

        /* Stopka */
        .sp-window-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background: rgba(var(--surface-rgb), 0.3);
        }
        .sp-footer-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
