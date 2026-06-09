"use client";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';

export default function Home() {
  const { accentColor } = useTheme();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("session")) {
      window.location.href = "/servers";
      return;
    }
    setChecking(false);
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }} />
  );

  return (
    <div className="lp-root">
      <div className="lp-window">

        {/* Baner — sam obraz, bez logo */}
        <div className="lp-banner">
          <img src="/resources/baner.png" alt="" className="lp-banner-img" />
          <div className="lp-banner-overlay" />
        </div>

        {/* Treść — logo tu, nad tytułem */}
        <div className="lp-body">
          <img src="/resources/logo.png" alt="LukRon Bot" className="lp-logo" />
          <h1 className="lp-title">
            LukRon<span style={{ color: accentColor }}> Bot</span>
          </h1>
          <p className="lp-sub">Zaawansowany panel zarządzania botem Discord</p>

          <button onClick={handleLogin} className="lp-btn" style={{ background: accentColor }}>
            <svg className="lp-discord-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Zaloguj przez Discord
          </button>

          <p className="lp-footer">
            Logowanie odbywa się przez oficjalną stronę Discord.<br />
            Aplikacja mobilna ani desktopowa nie jest wymagana.
          </p>
        </div>

      </div>

      <style jsx>{`
        .lp-root {
          min-height: 100vh;
          background: var(--bg-color);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        .lp-window {
          width: 100%;
          max-width: 420px;
          background: rgba(var(--surface-rgb), var(--surface-opacity));
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
        }

        /* Baner */
        .lp-banner {
          position: relative;
          height: 180px;
          overflow: hidden;
        }
        .lp-banner-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 25%;
          display: block;
        }
        .lp-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.0) 0%,
            rgba(0,0,0,0.2) 60%,
            var(--bg-color) 100%
          );
        }

        /* Treść */
        .lp-body {
          padding: 1.5rem 2rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: rgba(var(--surface-rgb), 0.4);
        }

        /* Logo — nad tytułem, w treści */
        .lp-logo {
          width: 72px;
          height: 72px;
          object-fit: contain;
          border-radius: 16px;
          margin-bottom: 1rem;
          border: 1px solid var(--border-color);
          background: rgba(var(--surface-rgb), var(--surface-opacity));
          padding: 6px;
        }

        .lp-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-color);
          margin: 0 0 0.4rem;
          letter-spacing: -0.5px;
        }
        .lp-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 1.75rem;
          line-height: 1.5;
        }

        .lp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.85rem 1.5rem;
          color: #fff;
          border: none;
          border-radius: var(--border-radius);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1.25rem;
        }
        .lp-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }
        .lp-btn:active {
          transform: translateY(0);
          filter: brightness(0.95);
        }
        .lp-discord-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .lp-footer {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
