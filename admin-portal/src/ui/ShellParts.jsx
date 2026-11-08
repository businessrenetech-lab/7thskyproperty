import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, TriangleAlert, CircleCheck, Info, User, Settings, Users, LogOut } from 'lucide-react';
import api from '../services/api';

/* Closes a popover on a click outside it or on Escape (focus goes back to its button). */
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') { close(); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref, open, close]);
}

const clockTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
const longDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (d) => d.toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
});
const sameDay = (a, b) => a.toDateString() === b.toDateString();

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
const ago = (d) => {
  const s = (d.getTime() - Date.now()) / 1000;
  const hit = UNITS.find(([, sec]) => Math.abs(s) >= sec);
  return hit ? rtf.format(Math.round(s / hit[1]), hit[0]) : 'just now';
};

/* The time on the minute, and today's date. */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t;
    const tick = () => { setNow(new Date()); t = setTimeout(tick, 60000 - (Date.now() % 60000) + 50); };
    t = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    // Timers sleep in background tabs; catch up when the tab is shown again.
    const onShow = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onShow); };
  }, []);
  return (
    <time className="ss-clock" dateTime={now.toISOString()} title={longDate(now)}>
      <span className="ss-clock-time">{clockTime(now)}</span>
      <span className="ss-clock-date">{longDate(now)}</span>
    </time>
  );
}

const NOTE_LOOK = {
  alert: { icon: TriangleAlert, bg: '#FEF3C7', fg: '#B45309' },
  warning: { icon: TriangleAlert, bg: '#FEF3C7', fg: '#B45309' },
  success: { icon: CircleCheck, bg: '#DCFCE7', fg: '#15803D' },
  info: { icon: Info, bg: '#E0F2FE', fg: '#0369A1' },
};
const SHOWN = 20;

export function Notifications() {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const load = useCallback(() => {
    api.get('/notifications')
      .then((r) => { setItems(Array.isArray(r.data) ? r.data : []); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const unread = items.filter((n) => !n.is_read);
  const markRead = (ids) => {
    if (!ids.length) return;
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    Promise.allSettled(ids.map((id) => api.put(`/notifications/${id}/read`))).then((res) => {
      if (res.some((r) => r.status === 'rejected')) load();
    });
  };

  return (
    <div className="ss-pop" ref={ref}>
      <button type="button" className="ss-tool-btn" aria-haspopup="dialog" aria-expanded={open}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
        onClick={() => setOpen((o) => !o)}>
        <Bell size={19} />
        {unread.length > 0 && <span className="ss-badge" aria-hidden="true">{unread.length > 99 ? '99+' : unread.length}</span>}
      </button>
      {open && (
        <div className="ss-panel ss-notes" role="dialog" aria-label="Notifications">
          <div className="ss-notes-head">
            <div>
              <h2>Notifications</h2>
              <p>{unread.length ? `${unread.length} unread` : 'All read'}</p>
            </div>
            {unread.length > 0 && (
              <button type="button" className="ss-link" onClick={() => markRead(unread.map((n) => n.id))}>Mark all as read</button>
            )}
          </div>
          {failed && !items.length ? (
            <div className="ss-notes-empty">
              Notifications could not be loaded. <button type="button" className="ss-link" onClick={load}>Try again</button>
            </div>
          ) : !items.length ? (
            <div className="ss-notes-empty">No notifications yet. Alerts about your properties and jobs will appear here.</div>
          ) : (
            <>
              <ul>
                {items.slice(0, SHOWN).map((n) => {
                  const look = NOTE_LOOK[n.type] || NOTE_LOOK.info;
                  const at = new Date(n.createdAt || n.created_at);
                  return (
                    <li key={n.id}>
                      <button type="button" className={`ss-note ${n.is_read ? '' : 'is-unread'}`}
                        onClick={() => markRead(n.is_read ? [] : [n.id])}
                        aria-label={`${n.is_read ? '' : 'Unread. '}${n.title}. ${n.message || ''}`}>
                        <span className="ss-note-icon" style={{ background: look.bg, color: look.fg }}><look.icon size={16} /></span>
                        <span className="ss-note-body">
                          <span className="ss-note-title">{n.title}</span>
                          {n.message && <span className="ss-note-msg">{n.message}</span>}
                          <time className="ss-note-when" dateTime={at.toISOString()}>
                            {shortDate(at)}, {clockTime(at)} · {ago(at)}
                          </time>
                        </span>
                        {!n.is_read && <span className="ss-dot" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {items.length > SHOWN && <div className="ss-notes-foot">Showing the {SHOWN} most recent</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// When this session began, from the sign-in token's issue time.
const signedInAt = () => {
  try {
    const part = localStorage.getItem('token')?.split('.')[1];
    const { iat } = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return iat ? new Date(iat * 1000) : null;
  } catch { return null; }
};

export const initialsOf = (name) => (name || 'U').split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
export const roleLabel = (role) => {
  const s = (role || '').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function ProfileMenu({ user, onSignOut }) {
  const ref = useRef(null);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const isAdmin = ['super_admin', 'branch_admin'].includes(user?.role);
  const since = open ? signedInAt() : null;
  const branch = user?.Branch?.name?.split(' — ').pop();
  const go = (to) => { setOpen(false); nav(to); };

  return (
    <div className="ss-pop" ref={ref}>
      <button type="button" className="ss-profile-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ss-avatar" aria-hidden="true">{initialsOf(user?.name)}</span>
        <span className="ss-who">
          <strong>{user?.name || 'User'}</strong>
          <span>{roleLabel(user?.role)}</span>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="ss-panel ss-menu">
          <div className="ss-menu-head">
            <span className="ss-avatar is-lg" aria-hidden="true">{initialsOf(user?.name)}</span>
            <div>
              <strong>{user?.name || 'User'}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <div className="ss-menu-meta">
            <strong>{roleLabel(user?.role)}</strong>
            {[branch, since && `signed in ${sameDay(since, new Date()) ? '' : shortDate(since) + ', '}${clockTime(since)}`].filter(Boolean).join(' · ')}
          </div>
          <div className="ss-menu-list" role="menu" aria-label="Account">
            <button type="button" role="menuitem" onClick={() => go('/account')}><User size={17} /> My account</button>
            {isAdmin && <button type="button" role="menuitem" onClick={() => go('/settings')}><Settings size={17} /> System settings</button>}
            {isAdmin && <button type="button" role="menuitem" onClick={() => go('/users')}><Users size={17} /> Users &amp; roles</button>}
          </div>
          <div className="ss-menu-list">
            <button type="button" className="is-danger" onClick={() => { setOpen(false); onSignOut(); }}><LogOut size={17} /> Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
