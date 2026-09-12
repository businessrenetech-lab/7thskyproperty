import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';
import '../styles/toast.css';

/* ─── Toast Configuration ──────────────────────────────────── */
const TOAST_CONFIG = {
  success: {
    icon: Check,
    accent: '#10b981',
    iconBg: '#ecfdf5',
    iconColor: '#059669',
    iconBorder: '#a7f3d0',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    accent: '#ef4444',
    iconBg: '#fef2f2',
    iconColor: '#dc2626',
    iconBorder: '#fecaca',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    accent: '#f59e0b',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    iconBorder: '#fde68a',
    label: 'Warning',
  },
  info: {
    icon: Info,
    accent: '#0284c7',
    iconBg: '#f0f9ff',
    iconColor: '#0284c7',
    iconBorder: '#bae6fd',
    label: 'Info',
  },
  loading: {
    icon: Loader2,
    accent: '#6366f1',
    iconBg: '#eef2ff',
    iconColor: '#4f46e5',
    iconBorder: '#c7d2fe',
    label: 'Loading',
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
    if (toast.duration === Infinity) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 260);
    }, remainingRef.current);

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

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimeout(() => onDismiss(toast.id), 260);
  }, [onDismiss, toast.id]);

  const hasTitle = Boolean(toast.title);

  return (
    <div
      className={`sspc-toast la-toast ${isExiting ? 'sspc-toast-exit la-toast-exit' : 'sspc-toast-enter la-toast-enter'}`}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      role="alert"
      aria-live="assertive"
      style={{
        '--toast-accent': config.accent,
        '--toast-icon-bg': config.iconBg,
        '--toast-icon-color': config.iconColor,
        '--toast-icon-border': config.iconBorder,
        alignItems: hasTitle ? 'flex-start' : 'center',
      }}
    >
      {/* Icon Badge */}
      <div className="sspc-toast-icon la-toast-icon">
        <Icon
          size={16}
          strokeWidth={toast.type === 'success' ? 2.6 : 2.2}
          className={toast.type === 'loading' ? 'animate-spin' : ''}
        />
      </div>

      {/* Content */}
      <div className="sspc-toast-content la-toast-content">
        {hasTitle ? (
          <>
            <span className="sspc-toast-title la-toast-title">{toast.title}</span>
            <p className="sspc-toast-message la-toast-message">{toast.message}</p>
          </>
        ) : (
          <span className="sspc-toast-single-line la-toast-message">{toast.message}</span>
        )}

        {toast.action && (
          <button
            type="button"
            className="sspc-toast-action"
            onClick={(e) => {
              e.stopPropagation();
              toast.action.onClick?.();
              handleDismiss();
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        className="sspc-toast-close la-toast-close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        <X size={14} strokeWidth={2} />
      </button>

      {/* Micro Progress Bar */}
      {toast.duration !== Infinity && (
        <div className="sspc-toast-progress la-toast-progress">
          <div
            className="sspc-toast-progress-bar la-toast-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

/* ─── Toast Container ──────────────────────────────────────── */
const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="sspc-toast-container la-toast-container"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        bottom: 'auto',
        zIndex: 999999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'visible',
      }}
    >
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
    setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []));
  }, []);

  const addToast = useCallback((type, ...args) => {
    const id = ++toastIdCounter;
    let title = '';
    let message = '';
    let duration = type === 'error' ? 5000 : DEFAULT_DURATION;
    let action = null;

    if (typeof args[0] === 'object' && args[0] !== null) {
      const opts = args[0];
      title = opts.title || '';
      message = opts.message || opts.description || '';
      if (opts.duration !== undefined) duration = opts.duration;
      action = opts.action || null;
    } else if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      title = args[0];
      message = args[1];
      if (typeof args[2] === 'number') duration = args[2];
      if (typeof args[2] === 'object') action = args[2]?.action;
    } else if (typeof args[0] === 'string') {
      message = args[0];
      if (typeof args[1] === 'number') {
        duration = args[1];
      } else if (typeof args[1] === 'object' && args[1] !== null) {
        if (args[1].title) title = args[1].title;
        if (args[1].duration !== undefined) duration = args[1].duration;
        if (args[1].action) action = args[1].action;
      }
    } else {
      message = String(args[0] || '');
    }

    const newToast = { id, type, title, message, duration, action };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(updated.length - MAX_TOASTS);
      }
      return updated;
    });

    return id;
  }, []);

  const stableToast = useRef({
    success: (...args) => addToast('success', ...args),
    error: (...args) => addToast('error', ...args),
    warning: (...args) => addToast('warning', ...args),
    info: (...args) => addToast('info', ...args),
    loading: (...args) => addToast('loading', ...args),
    promise: async (promise, { loading, success, error } = {}) => {
      const id = addToast('loading', loading || 'Processing...', Infinity);
      try {
        const result = await promise;
        dismiss(id);
        addToast('success', typeof success === 'function' ? success(result) : (success || 'Completed successfully'));
        return result;
      } catch (err) {
        dismiss(id);
        const errMsg = typeof error === 'function' ? error(err) : (error || err.response?.data?.error || err.message || 'Operation failed');
        addToast('error', errMsg);
        throw err;
      }
    },
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

