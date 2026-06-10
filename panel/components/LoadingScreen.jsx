"use client";
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-context';

const LOADING_MESSAGES = [
  'Ładowanie danych...',
  'Przygotowywanie panelu...',
  'Synchronizacja z botem...',
  'Pobieranie konfiguracji...',
  'Prawie gotowe...',
];

export default function LoadingScreen({ message, fullPage }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState('');
  const { accentColor } = useTheme();

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => { clearInterval(msgInterval); clearInterval(dotInterval); };
  }, []);

  const content = (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-ring" style={{ borderTopColor: accentColor }} />
        <div className="spinner-ring spinner-ring-inner" style={{ borderTopColor: accentColor }} />
        <div className="spinner-logo" style={{ color: accentColor }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>
      <div className="loading-text">{message || LOADING_MESSAGES[msgIndex]}{dots}</div>
      <div className="loading-bar">
        <div className="loading-bar-fill" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}dd)` }} />
      </div>
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 40px;
          ${fullPage ? `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-color, #0a0a0f);
            z-index: 9999;
          ` : `
            min-height: 300px;
            width: 100%;
          `}
        }

        .loading-spinner {
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-ring-inner {
          width: 75%;
          height: 75%;
          animation-duration: 0.8s;
          animation-direction: reverse;
        }

        .spinner-logo {
          opacity: 0.8;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 0.95rem;
          color: var(--text-muted, #6b6b76);
          font-weight: 500;
          min-height: 1.5em;
          text-align: center;
        }

        .loading-bar {
          width: 200px;
          height: 3px;
          background: var(--border-color, #1e1e26);
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-bar-fill {
          height: 100%;
          border-radius: 2px;
          animation: loadingProgress 2s ease-in-out infinite;
          width: 30%;
        }

        @keyframes loadingProgress {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 60%; }
          100% { transform: translateX(400%); width: 30%; }
        }
      `}</style>
    </div>
  );

  return content;
}
