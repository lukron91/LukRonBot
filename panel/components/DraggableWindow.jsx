"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';
import { FiX, FiMinus, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { useTheme } from '@/lib/theme-context';

let globalZIndex = 1000;

export default function DraggableWindow({
  isOpen,
  onClose,
  title = 'Okno',
  children,
  width = '600px',
  height,
  type = 'modal',
  id,
  showOverlay,
  resizable = false,
  defaultPosition = { x: 0, y: 0 },
}) {
  const { theme } = useTheme();
  const nodeRef = useRef(null);
  const [zIndex, setZIndex] = useState(globalZIndex);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [position, setPosition] = useState(defaultPosition);
  const [restoredPosition, setRestoredPosition] = useState(null);
  const overlayRef = useRef(null);
  const initialized = useRef(false);

  const effectiveOverlay = showOverlay !== undefined ? showOverlay : type === 'modal';

  // Wczytaj zapamiętaną pozycję z localStorage
  useEffect(() => {
    if (id && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dw_pos_${id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPosition(parsed);
        }
      } catch {}
    }
  }, [id]);

  // Auto-center przy pierwszym otwarciu
  useEffect(() => {
    if (isOpen && !initialized.current && typeof window !== 'undefined') {
      initialized.current = true;
      // Jeśli nie ma zapisanej pozycji, wyśrodkuj
      if (!id || !localStorage.getItem(`dw_pos_${id}`)) {
        const w = Math.min(parseInt(width), window.innerWidth - 40);
        const h = height ? Math.min(parseInt(height), window.innerHeight - 40) : 400;
        setPosition({
          x: Math.max(0, (window.innerWidth - w) / 2),
          y: Math.max(0, (window.innerHeight - h) / 3),
        });
      }
    }
  }, [isOpen, id, width, height]);

  // Z-index stacking
  useEffect(() => {
    if (isOpen) {
      globalZIndex += 1;
      setZIndex(globalZIndex);
    }
  }, [isOpen]);

  // Escape do zamknięcia
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Blokada scrolla dla modali
  useEffect(() => {
    if (isOpen && effectiveOverlay) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, effectiveOverlay]);

  const bringToFront = useCallback(() => {
    globalZIndex += 1;
    setZIndex(globalZIndex);
  }, []);

  const handleStop = useCallback((e, data) => {
    const newPos = { x: data.x, y: data.y };
    setPosition(newPos);
    if (id && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dw_pos_${id}`, JSON.stringify(newPos));
      } catch {}
    }
  }, [id]);

  const toggleMinimize = useCallback(() => {
    if (!minimized) {
      setRestoredPosition(position);
      setMinimized(true);
    } else {
      setMinimized(false);
      if (restoredPosition) setPosition(restoredPosition);
    }
  }, [minimized, position, restoredPosition]);

  const toggleMaximize = useCallback(() => {
    setMaximized((prev) => !prev);
    if (maximized && restoredPosition) {
      setPosition(restoredPosition);
    } else if (!maximized) {
      setRestoredPosition(position);
    }
  }, [maximized, position, restoredPosition]);

  if (!isOpen) return null;

  const rgb = theme?.mode === 'light' ? '255, 255, 255' : '20, 20, 28';

  const windowContent = (
    <div
      className={`draggable-window ${type === 'modal' ? 'dw-modal' : 'dw-window'} ${minimized ? 'dw-minimized' : ''} ${maximized ? 'dw-maximized' : ''}`}
      style={{
        zIndex,
        width: maximized ? '100vw' : width,
        height: maximized ? '100vh' : height || 'auto',
        background: `rgba(${rgb}, var(--window-opacity, 0.85))`,
        borderRadius: maximized ? '0' : 'var(--border-radius)',
        top: maximized ? '0' : 'auto',
        left: maximized ? '0' : 'auto',
      }}
      onClick={bringToFront}
    >
      {/* Nagłówek — uchwyt do przeciągania */}
      <div className="dw-header">
        <span className="dw-title">{title}</span>
        <div className="dw-header-buttons">
          <button className="dw-btn" onClick={toggleMinimize} title="Minimalizuj">
            <FiMinus />
          </button>
          <button className="dw-btn" onClick={toggleMaximize} title={maximized ? 'Przywróć' : 'Maksymalizuj'}>
            {maximized ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
          <button className="dw-btn dw-btn-close" onClick={onClose} title="Zamknij">
            <FiX />
          </button>
        </div>
      </div>

      {/* Treść */}
      {!minimized && (
        <div className="dw-body" style={{ maxHeight: maximized ? 'calc(100vh - 48px)' : height ? `calc(${height} - 48px)` : 'none' }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Nakładka (tylko dla typu modal) */}
      {effectiveOverlay && (
        <div
          ref={overlayRef}
          className="dw-overlay"
          style={{ zIndex: zIndex - 1 }}
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        />
      )}

      {/* Przeciągalne okno */}
      {maximized ? (
        windowContent
      ) : (
        <Draggable
          nodeRef={nodeRef}
          handle=".dw-header"
          position={minimized ? { x: 0, y: 0 } : undefined}
          defaultPosition={defaultPosition}
          onStop={handleStop}
          bounds="parent"
          disabled={minimized}
        >
          <div ref={nodeRef} style={{ position: 'fixed', zIndex }}>
            {windowContent}
          </div>
        </Draggable>
      )}

      <style jsx>{`
        .dw-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          animation: dwFadeIn 0.2s ease;
        }
        @keyframes dwFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .draggable-window {
          border: 1px solid var(--border-color);
          backdrop-filter: blur(12px);
          color: var(--text-color);
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: dwSlideUp 0.25s ease;
          overflow: hidden;
        }
        .draggable-window.dw-modal {
          /* styl dla modala */
        }
        .draggable-window.dw-window {
          border-color: rgba(var(--accent-color), 0.3);
        }
        .draggable-window.dw-minimized {
          width: 280px !important;
          height: auto !important;
          position: fixed !important;
          bottom: 0 !important;
          right: 1rem !important;
          border-radius: var(--border-radius) var(--border-radius) 0 0 !important;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        }
        .draggable-window.dw-maximized {
          position: fixed !important;
          inset: 0 !important;
          border-radius: 0 !important;
          border: none !important;
        }
        @keyframes dwSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .dw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          cursor: grab;
          user-select: none;
          flex-shrink: 0;
          min-height: 48px;
        }
        .dw-header:active {
          cursor: grabbing;
        }
        .dw-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--accent-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dw-header-buttons {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .dw-btn {
          background: none;
          border: 1px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.3rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 0.95rem;
          height: 2rem;
          width: 2rem;
        }
        .dw-btn:hover {
          color: var(--text-color);
          background: rgba(128, 128, 128, 0.15);
          border-color: var(--border-color);
        }
        .dw-btn-close:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .dw-body {
          padding: 1.25rem;
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
    </>
  );
}
