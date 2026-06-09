"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from '@/lib/theme-context';
import Modal from '@/components/Modal';
import { FiLogOut, FiPlusCircle, FiSettings, FiShield, FiUser } from 'react-icons/fi';

export default function ServersPage() {
  const { accentColor } = useTheme();
  const router = useRouter();
  const [userGuilds, setUserGuilds] = useState([]);
  const [user, setUser] = useState(null);
  const [botGuildIds, setBotGuildIds] = useState(new Set());
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) { router.push("/"); return; }
      try {
        const session = JSON.parse(sessionRaw);
        setUser(session);
        setUserGuilds(session.guilds || []);

        // Pobierz serwery na których jest bot
        try {
          const botRes = await fetch('/api/proxy/api/guilds');
          const botData = await botRes.json();
          if (botData.success) {
            setBotGuildIds(new Set((botData.guilds || []).map(g => g.id)));
          }
        } catch {}

        setLoading(false);
      } catch {
        router.push("/");
      }
    };
    init();
  }, [router]);

  const confirmLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem("session");
    window.location.href = "/";
  };

  const [activeTab, setActiveTab] = useState('user');

  // Serwery gdzie jest bot (dostępne dla użytkownika)
  const guildsWithBot = userGuilds.filter(g => botGuildIds.has(g.id));
  // Serwery gdzie user ma admina
  const adminGuilds = userGuilds.filter(g => (BigInt(g.permissions) & 0x8n) !== 0n);
  // Serwery gdzie nie ma bota ale user ma admina (może zaprosić)
  const inviteGuilds = adminGuilds.filter(g => !botGuildIds.has(g.id));

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1511561628733276280";

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
      Ładowanie...
    </div>
  );

  return (
    <div className="sp-root">
      <div className="sp-window-wrap">
        <div className="sp-window">

          {/* Baner */}
          <div className="sp-banner">
            <img src="/resources/baner-dashboard.png" alt="" className="sp-banner-img" />
            <div className="sp-banner-overlay" />
            <div className="sp-banner-content">
              <div className="sp-logo-row">
                <img src="/resources/logo.png" alt="LukRon Bot" className="sp-logo" />
                <div>
                  <div className="sp-title" style={{ color: accentColor }}>LukRon Bot</div>
                  <div className="sp-subtitle">Panel sterowania</div>
                </div>
              </div>
            </div>
          </div>

          {/* Nagłówek */}
          <div className="sp-window-header">
            <div>
              <h2 className="sp-window-title">Wybierz serwer</h2>
              <p className="sp-window-sub">Wybierz serwer do zarządzania</p>
            </div>
            {user && (
              <div className="sp-user">
                {user.avatar
                  ? <img src={'https://cdn.discordapp.com/avatars/' + user.userId + '/' + user.avatar + '.png'} alt="" className="sp-user-avatar" />
                  : <div className="sp-user-placeholder" style={{ background: accentColor }}>{user.username?.[0]?.toUpperCase()}</div>
                }
                <span className="sp-user-name">{user.username}</span>
              </div>
            )}
          </div>

          {/* Taby */}
          <div className="sp-tabs">
            <button
              className={`sp-tab ${activeTab === 'user' ? 'active' : ''}`}
              onClick={() => setActiveTab('user')}
              style={activeTab === 'user' ? { borderBottomColor: accentColor, color: accentColor } : {}}
            >
              <FiUser /> Panel użytkownika
            </button>
            <button
              className={`sp-tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={activeTab === 'admin' ? { borderBottomColor: accentColor, color: accentColor } : {}}
            >
              <FiShield /> Panel administracyjny
            </button>
          </div>

          {/* ─── TAB: Panel użytkownika ─── */}
          {activeTab === 'user' && (
            <div className="sp-section">
              <div className="sp-section-header">
                <FiUser className="sp-section-icon" />
                <span className="sp-section-title">Serwery z botem</span>
                <span className="sp-section-count">{guildsWithBot.length}</span>
              </div>

              {guildsWithBot.length === 0 ? (
                <div className="sp-empty">
                  <p>Brak serwerów z botem.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Bot nie został dodany na żaden serwer na którym jesteś.
                  </p>
                </div>
              ) : (
                guildsWithBot.map(guild => (
                  <div key={guild.id} className="sp-server-row">
                    <div className="sp-server-icon">
                      {guild.icon
                        ? <img src={'https://cdn.discordapp.com/icons/' + guild.id + '/' + guild.icon + '.png'} alt="" />
                        : <div className="sp-server-placeholder" style={{ background: accentColor }}>{guild.name.charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div className="sp-server-info">
                      <span className="sp-server-name">{guild.name}</span>
                      <span className="sp-server-id">ID: {guild.id}</span>
                    </div>
                    <div className="sp-server-action">
                      <button
                        onClick={() => router.push('/dashboard?guild=' + guild.id)}
                        className="btn-base btn-success"
                      >
                        <FiSettings /> Otwórz panel
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── TAB: Panel administracyjny ─── */}
          {activeTab === 'admin' && (
            <div className="sp-section">
              <div className="sp-section-header">
                <FiShield className="sp-section-icon" />
                <span className="sp-section-title">Twoje serwery</span>
                <span className="sp-section-count">{adminGuilds.length}</span>
              </div>

              {adminGuilds.length === 0 ? (
                <div className="sp-empty">
                  <p>Nie zarządzasz żadnym serwerem.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Musisz mieć uprawnienia administratora na serwerze, aby zarządzać botem.
                  </p>
                </div>
              ) : (
                adminGuilds.map(guild => {
                  const hasBot = botGuildIds.has(guild.id);
                  return (
                    <div key={guild.id} className="sp-server-row">
                      <div className="sp-server-icon">
                        {guild.icon
                          ? <img src={'https://cdn.discordapp.com/icons/' + guild.id + '/' + guild.icon + '.png'} alt="" />
                          : <div className="sp-server-placeholder" style={{ background: accentColor }}>{guild.name.charAt(0).toUpperCase()}</div>
                        }
                      </div>
                      <div className="sp-server-info">
                        <span className="sp-server-name">{guild.name}</span>
                        <span className="sp-server-id">ID: {guild.id}</span>
                      </div>
                      <div className="sp-server-action">
                        {hasBot ? (
                          <button
                            onClick={() => router.push('/dashboard?guild=' + guild.id)}
                            className="btn-base btn-success"
                          >
                            <FiSettings /> Zarządzaj
                          </button>
                        ) : (
                          <a
                            href={'https://discord.com/api/oauth2/authorize?client_id=' + clientId + '&permissions=8&scope=bot%20applications.commands&guild_id=' + guild.id}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-base btn-success"
                          >
                            <FiPlusCircle /> Dodaj bota
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Stopka */}
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
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        .sp-window-wrap {
          width: 100%;
          max-width: 680px;
        }
        .sp-window {
          width: 100%;
          background: #000;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6);
        }

        .sp-banner {
          position: relative;
          height: 160px;
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
          background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 70%, #000 100%);
        }
        .sp-banner-content {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 1.25rem 1.5rem;
        }
        .sp-logo-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sp-logo {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: contain;
        }
        .sp-title {
          font-size: 1.3rem;
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0 2px 6px rgba(0,0,0,0.9);
        }
        .sp-subtitle {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.55);
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
          margin-top: 0.15rem;
        }

        .sp-window-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem 1rem;
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

        /* Taby */
        .sp-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          background: rgba(var(--surface-rgb), 0.1);
        }
        .sp-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sp-tab:hover {
          color: var(--text-color);
          background: rgba(var(--surface-rgb), 0.15);
        }
        .sp-tab.active {
          background: rgba(var(--surface-rgb), 0.08);
        }

        /* Sekcje */
        .sp-section {
          border-bottom: 1px solid var(--border-color);
        }
        .sp-section:last-child {
          border-bottom: none;
        }
        .sp-section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(var(--surface-rgb), 0.15);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .sp-section-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .sp-section-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sp-section-count {
          margin-left: auto;
          font-size: 0.7rem;
          color: var(--text-muted);
          background: rgba(var(--surface-rgb), 0.3);
          padding: 0.15rem 0.5rem;
          border-radius: 99px;
        }

        .sp-empty {
          padding: 2rem 1.5rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .sp-server-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
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
          width: 40px;
          height: 40px;
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
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
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
          font-size: 0.85rem;
        }
        .sp-server-id {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .sp-server-action {
          flex-shrink: 0;
        }
        .sp-join-hint, .sp-no-bot {
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 0 0.5rem;
          white-space: nowrap;
        }

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
