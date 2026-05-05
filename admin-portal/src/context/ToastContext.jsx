import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ─── Toast Configuration ──────────────────────────────────── */
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.25)',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.25)',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.25)',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.25)',
    label: 'Info',
  },
};

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

/* ─── Context ──────────────────────────────────────────────── */
const ToastContext = createContext(null);

/* ─── Single Toast Item ────────────────────────────────────── */
const ToastItem = ({ toast, onDismiss }) => {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(toast.duration);
  const rafRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 320);
    }, remainingRef.current);

    // Progress bar animation
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingRef.current - elapsed;
      const pct = Math.max(0, (remaining / toast.duration) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [toast.id, toast.duration, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    remainingRef.current -= (Date.now() - startTimeRef.current);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startTimer]);

  const handleDismiss = () => {
    setIsExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimeout(() => onDismiss(toast.id), 320);
  };

  return (
    <div
      className={`la-toast ${isExiting ? 'la-toast-exit' : 'la-toast-enter'}`}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      role="alert"
      aria-live="assertive"
      style={{
        '--toast-color': config.color,
        '--toast-glow': config.glow,
        '--toast-border': config.border,
      }}
    >
      {/* Icon */}
      <div className="la-toast-icon">
        <Icon size={20} />
      </div>

      {/* Content */}
      <div className="la-toast-content">
        <span className="la-toast-title">{config.label}</span>
        <p className="la-toast-message">{toast.message}</p>
      </div>

      {/* Close */}
      <button
        className="la-toast-close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="la-toast-progress">
        <div
          className="la-toast-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/* ─── Toast Container ──────────────────────────────────────── */
const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="la-toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

/* ─── Provider ─────────────────────────────────────────────── */
let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = DEFAULT_DURATION) => {
    const id = ++toastIdCounter;
    const newToast = { id, type, message, duration };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Keep only the last MAX_TOASTS
      if (updated.length > MAX_TOASTS) {
        return updated.slice(updated.length - MAX_TOASTS);
      }
      return updated;
    });

    return id;
  }, []);

  const stableToast = useRef({
    success: (...args) => addToast('success', ...args),
    error: (msg, dur) => addToast('error', msg, dur || 5000),
    warning: (...args) => addToast('warning', ...args),
    info: (...args) => addToast('info', ...args),
    dismiss: (...args) => dismiss(...args),
  }).current;

  return (
    <ToastContext.Provider value={stableToast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

/* ─── Hook ─────────────────────────────────────────────────── */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export default ToastContext;
