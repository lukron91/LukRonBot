"use client";
import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { useTheme } from '@/lib/theme-context';

export default function Modal({ isOpen, onClose, title, children, width = '440px' }) {
  const overlayRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rgb = theme?.mode === 'light' ? '255, 255, 255' : '20, 20, 28';

  return (
    <div
      ref={overlayRef}
      className="modal-overlay-custom"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal-container-custom" style={{ maxWidth: width, background: `rgba(${rgb}, var(--surface-opacity, 0.95))` }}>
        <div className="modal-header-custom">
          <h2 style={{ color: 'var(--accent-color)' }}>{title}</h2>
          <button onClick={onClose} className="modal-close-custom" title="Zamknij">
            <FiX />
          </button>
        </div>
        <div className="modal-body-custom">
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay-custom {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: modalFadeIn 0.2s ease;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-container-custom {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          backdrop-filter: blur(12px);
          color: var(--text-color);
          animation: modalSlideUp 0.25s ease;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-header-custom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header-custom h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .modal-close-custom {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 1.1rem;
        }
        .modal-close-custom:hover {
          color: var(--text-color);
          background: rgba(128,128,128,0.15);
        }
        .modal-body-custom {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
    </div>
  );
}
