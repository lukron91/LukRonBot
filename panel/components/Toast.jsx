"use client";
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
      <style jsx global>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        .toast-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          background: var(--surface-color, #1e1e2e);
          border: 1px solid var(--border-color, #2a2a3a);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          pointer-events: auto;
          min-width: 300px;
          max-width: 450px;
          animation: toastSlideIn 0.3s ease-out;
          font-size: 0.9rem;
          color: var(--text-color, #e0e0e0);
        }
        .toast-item.removing {
          animation: toastSlideOut 0.25s ease-in forwards;
        }
        .toast-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
        }
        .toast-icon.success { color: #22c55e; }
        .toast-icon.error { color: #ef4444; }
        .toast-icon.info { color: #3b82f6; }
        .toast-message {
          flex: 1;
          line-height: 1.4;
        }
        .toast-close {
          flex-shrink: 0;
          background: none;
          border: none;
          color: var(--text-muted, #888);
          cursor: pointer;
          padding: 2px;
          opacity: 0.6;
          transition: opacity 0.15s;
        }
        .toast-close:hover { opacity: 1; }
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRemoving(true);
      setTimeout(() => onRemove(toast.id), 250);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const icons = {
    success: <FiCheckCircle className="toast-icon success" />,
    error: <FiAlertCircle className="toast-icon error" />,
    info: <FiInfo className="toast-icon info" />,
  };

  return (
    <div className={`toast-item ${removing ? 'removing' : ''}`}>
      {icons[toast.type] || icons.info}
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => { setRemoving(true); setTimeout(() => onRemove(toast.id), 250); }}>
        <FiX size={16} />
      </button>
    </div>
  );
}
