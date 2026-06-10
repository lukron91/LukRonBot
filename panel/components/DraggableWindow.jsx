"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMinus, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { useTheme } from '@/lib/theme-context';

let globalZIndex = 1000;

function calcCenter(width, height) {
  if (typeof window === 'undefined') return { x: 0, y: 20 };
  const parsedW = typeof width === 'number' ? width : parseInt(width) || 600;
  const parsedH = height ? (typeof height === 'number' ? height : parseInt(height) || 400) : 400;
  const w = Math.min(parsedW, window.innerWidth - 40);
  const h = Math.min(parsedH, window.innerHeight - 40);
  return {
    x: Math.max(0, (window.innerWidth - w) / 2),
    y: Math.max(0, (window.innerHeight - h) / 3),
  };
}

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
  defaultPosition: propDefaultPos = { x: 0, y: 0 },
}) {
  const { theme } = useTheme();
  const nodeRef = useRef(null);
  const [zIndex, setZIndex] = useState(globalZIndex);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  // Inicjalizacja pozycji — wyliczana synchronicznie przed pierwszym renderem
  const [position, setPosition] = useState(() => {
    if (id && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dw_pos_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return calcCenter(width, height);
  });
  const [restoredPosition, setRestoredPosition] = useState(null);
  const overlayRef = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const wasOpen = useRef(false);

  const effectiveOverlay = showOverlay !== undefined ? showOverlay : type === 'modal';

  // Reset pozycji przy otwarciu — tylko gdy faktycznie otwieramy (nie przy pierwszym renderze)
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      wasOpen.current = true;
      let pos;
      if (id && typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(`dw_pos_${id}`);
          if (saved) pos = JSON.parse(saved);
        } catch {}
      }
      if (!pos) pos = calcCenter(width, height);
      setPosition(pos);
    } else if (!isOpen) {
      wasOpen.current = false;
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

  // Własna implementacja przeciągania — używamy natywnych eventów (Next.js portal issue)
  const posRef = useRef(position);
  posRef.current = position;
  const dragCleanup = useRef(null);

  const attachDragListeners = useCallback(() => {
    if (!isOpen || minimized || !nodeRef.current) return;
    const headerEl = nodeRef.current.querySelector('.dw-header');
    if (!headerEl) return;

    // Cleanup previous
    if (dragCleanup.current) {
      dragCleanup.current();
      dragCleanup.current = null;
    }

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      dragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: posRef.current.x,
        posY: posRef.current.y,
      };

      const onMove = (ev) => {
        if (!dragging.current) return;
        const dx = ev.clientX - dragStart.current.x;
        const dy = ev.clientY - dragStart.current.y;
        setPosition({
          x: dragStart.current.posX + dx,
          y: dragStart.current.posY + dy,
        });
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const w = nodeRef.current?.offsetWidth || parseInt(width) || 600;
        const h = nodeRef.current?.offsetHeight || 400;
        const maxX = Math.max(0, window.innerWidth - w - 20);
        const maxY = Math.max(0, window.innerHeight - h - 20);
        const clamped = {
          x: Math.min(Math.max(posRef.current.x, 20 - w + Math.min(w, window.innerWidth)), maxX),
          y: Math.min(Math.max(posRef.current.y, 0), maxY),
        };
        setPosition(clamped);
        if (id && typeof window !== 'undefined') {
          try {
            localStorage.setItem(`dw_pos_${id}`, JSON.stringify(clamped));
          } catch {}
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    headerEl.addEventListener('mousedown', onMouseDown);
    dragCleanup.current = () => headerEl.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, minimized, id, width]);

  // Użyj useEffect do podpięcia listenerów — obserwuj nodeRef.current
  useEffect(() => {
    if (!isOpen || minimized) return;

    // Retry until nodeRef.current is available
    let attempts = 0;
    const tryAttach = () => {
      attempts++;
      if (!nodeRef.current) {
        if (attempts < 100) {
          setTimeout(tryAttach, 50);
        }
        return;
      }
      attachDragListeners();
    };
    tryAttach();

    return () => {
      if (dragCleanup.current) {
        dragCleanup.current();
        dragCleanup.current = null;
      }
    };
  }, [isOpen, minimized, attachDragListeners]);

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

  const portal = (
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

      {/* Okno z pozycjonowaniem */}
      <div
        ref={nodeRef}
        className="dw-portal-container"
        style={{
          position: 'fixed',
          left: minimized ? 'auto' : position.x + 'px',
          top: minimized ? 'auto' : position.y + 'px',
          zIndex,
          right: minimized ? '1rem' : 'auto',
          bottom: minimized ? '0' : 'auto',
        }}
      >
        {windowContent}
      </div>

      <style jsx>{`
        .dw-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(var(--blur-intensity, 4px));
          animation: dwFadeIn 0.2s ease;
        }
        @keyframes dwFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .draggable-window {
          border: 1px solid var(--border-color);
          backdrop-filter: blur(var(--blur-intensity, 4px));
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

  return typeof window !== 'undefined'
    ? createPortal(portal, document.body)
    : portal;
}
