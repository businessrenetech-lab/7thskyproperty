import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Search, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ToastHost } from '../screens/watertank/common';
import CommandPalette from '../screens/watertank/CommandPalette';
import '../styles/wt-scope.css';

/*
 * ServiceConsole — the shell every service line opens in.
 *
 * A service console is a SEPARATED window: its own sidebar, its own theme, its
 * own URL space, rendered outside the global admin Layout rather than inside it.
 * Water Tank proved the shape; this is that shell with its five hard-coded seams
 * — nav, brand, endpoints, storage key, content class — turned into a config, so
 * the next vertical costs a config object rather than a copied file.
 *
 * Three things it does that a plain sidebar does not, and each earns its place:
 *
 *   GROUPS THAT REMEMBER. Eighteen flat links is a wall you re-read every time.
 *   Grouped, the eye lands on the section first. Collapse state persists per
 *   console, and the group containing the current page always opens.
 *
 *   BADGES THAT COUNT WHAT IS WAITING ON YOU, never how many rows exist.
 *   "Invoices 48" reads the same tomorrow whether you worked or not, so it stops
 *   being read. "Invoices 9" falling to zero is worth glancing at. A collapsed
 *   group rolls its children's counts up to the header, so collapsing can never
 *   hide work.
 *
 *   ⌘K over the SAME filtered list the sidebar drew, so the palette cannot offer
 *   a destination that has been hidden.
 *
 * Both permission styles are supported because the two consoles already use
 * different ones: `needs:` asks a server capabilities endpoint (Water Tank's
 * tiers), `roles:` matches the signed-in role (how Short Term Stay's nav gates
 * today). Both FAIL OPEN — hiding a link is a courtesy so people are not offered
 * doors that will not open; the API is what actually refuses, and it does so
 * regardless of what the sidebar drew.
 */

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform || '');

const readCollapsed = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
};

/** Initials for the footer avatar — two letters, from whatever name we have. */
const initials = (name) => String(name || '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'SS';

export default function ServiceConsole({ config }) {
  const {
    brand,                       // { name, sub, icon: Icon, accent }
    navGroups,
    storageKey,
    api: endpoints = {},         // { capabilities?, workQueue? } — both optional
    contentClass,                // e.g. 'pm-scope' for screens in the other design system
    exitTo = '/dashboard',
    exitLabel = 'Back to Seventh Sky Admin',
  } = config;

  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));
  const [badges, setBadges] = useState({});
  /*
   * What this user may do, from the console's capabilities endpoint — which
   * reads the SAME role tiers as the route guards. The UI must not keep its own
   * copy of an authorization rule; two copies is one rule and one bug waiting.
   */
  const [can, setCan] = useState(null);

  const flat = navGroups.flatMap((g) => g.items);

  // ⌘K / Ctrl-K opens the console-wide search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /*
   * Badges refresh on navigation rather than on a timer: the operator has just
   * done something, so this is exactly when a count is stale — and it costs
   * nothing when they are sitting still. Failure is silent; a sidebar that
   * cannot count is not a reason to show an error over the whole console.
   *
   * A console with no work-queue endpoint simply shows no badges.
   */
  const loadBadges = useCallback(() => {
    if (!endpoints.workQueue) return;
    api.get(endpoints.workQueue)
      .then((r) => setBadges(r.data?.badges || {}))
      .catch(() => { /* counts are a convenience, never a blocker */ });
  }, [endpoints.workQueue]);
  useEffect(loadBadges, [loadBadges, loc.pathname]);

  // Capabilities change only when the user does, so this runs once per mount.
  useEffect(() => {
    if (!endpoints.capabilities) return;
    api.get(endpoints.capabilities)
      .then((r) => setCan(r.data?.can || null))
      .catch(() => setCan(null));
  }, [endpoints.capabilities]);

  /**
   * A destination with neither `needs` nor `roles` is open to anyone who can
   * reach the console. Both checks fail open while the answer is unknown.
   */
  const allowed = (item) => {
    if (item.needs && can && !can[item.needs]) return false;
    if (item.roles && user?.role && !item.roles.includes(user.role)) return false;
    return true;
  };

  const toggle = (key) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* private mode */ }
    return next;
  });

  const Badge = ({ to }) => {
    const b = badges[to];
    if (!b?.count) return null;
    return (
      <span className={`wt-badge ${b.severity}`}
        title={(b.queues || []).map((q) => `${q.count} ${q.label.toLowerCase()}`).join('\n')}>
        {b.count > 99 ? '99+' : b.count}
      </span>
    );
  };

  const BrandIcon = brand.icon;

  /*
   * The accent is set as an inline custom property rather than in a second
   * stylesheet, so a new console re-skins with zero CSS. Every `var(--wt-accent)`
   * in the 1100-line design system picks it up.
   */
  const theme = brand.accent ? {
    '--wt-accent': brand.accent,
    '--wt-accent-strong': brand.accentStrong || brand.accent,
    '--wt-accent-ink': brand.accentInk || brand.accent,
    '--wt-accent-tint': brand.accentTint || `${brand.accent}1f`,
    '--wt-accent-tint-2': brand.accentTint2 || `${brand.accent}24`,
  } : undefined;

  return (
    <div className="wt-scope" style={theme}>
      <div className="wt-shell">
        <aside className="wt-side">
          <div className="wt-brand">
            <div className="wt-brand-row">
              <span className="wt-brand-mark"><BrandIcon size={20} /></span>
              <span className="wt-brand-name">{brand.name}</span>
            </div>
            <span className="wt-brand-sub">{brand.sub}</span>
          </div>

          <button className="wt-sidesearch" onClick={() => setPalette(true)}>
            <Search size={14} /> Search everything
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>

          <nav className="wt-nav">
            {navGroups.map((g) => {
              // Destinations this role cannot use are dropped first, so counts
              // and the "is this group empty" test are computed on what is shown.
              const items = g.items.filter(allowed);
              if (!items.length) return null;

              const shut = collapsed.has(g.key);
              // A collapsed group must not hide work, so its total moves up to
              // the header — and the group opens if the current page is inside.
              /*
               * Compared on the PATH alone. A nav item may carry a query string
               * — Property Management links several shared screens filtered by
               * one (`/property-management/work-orders?vertical=rental`) — and
               * `pathname` never contains a `?`, so comparing the raw `to` would
               * quietly fail to open the group holding the current page.
               */
              const inHere = items.some((i) => {
                const path = i.to.split('?')[0];
                return i.end ? loc.pathname === path : loc.pathname.startsWith(path);
              });
              const groupTotal = items.reduce((s, i) => s + (badges[i.to]?.count || 0), 0);
              const groupLate = items.some((i) => badges[i.to]?.severity === 'late');
              const open = !shut || inHere;

              return (
                <div className="wt-nav-group" key={g.key}>
                  <button className="wt-nav-grouphead" onClick={() => toggle(g.key)}
                    aria-expanded={open} title={open ? `Collapse ${g.label}` : `Expand ${g.label}`}>
                    {g.label}
                    {!open && groupTotal > 0 && (
                      <span className={`wt-badge ${groupLate ? 'late' : 'due'}`} style={{ marginLeft: 8 }}>
                        {groupTotal > 99 ? '99+' : groupTotal}
                      </span>
                    )}
                    <ChevronDown size={13} className={`chev${open ? '' : ' shut'}`} />
                  </button>

                  {open && items.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.end}
                      className={({ isActive }) => 'wt-nav-item' + (isActive ? ' on' : '')}>
                      <n.icon /> <span style={{ flex: '1 0 0', minWidth: 0 }}>{n.label}</span>
                      <Badge to={n.to} />
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>

          <div>
            {/*
              * The signed-in user, not a hard-coded name. The Water Tank console
              * shipped with "Dhaka Ops Center / admin@seventhsky.com" literal in
              * the JSX — every operator saw somebody else's name in the corner.
              */}
            <div className="wt-userfoot">
              <span className="wt-avatar">{initials(user?.name || user?.email)}</span>
              <div style={{ flex: '1 0 0', minWidth: 0 }}>
                <div className="nm">{user?.name || 'Seventh Sky'}</div>
                <div className="em">{user?.email || ''}</div>
              </div>
            </div>
            <button className="wt-exit" onClick={() => nav(exitTo)}>
              <LogOut size={13} /> {exitLabel}
            </button>
          </div>
        </aside>

        {/*
          * `contentClass` lets a console host screens written in another design
          * system. Short Term Stay's sixteen screens carry 284 `pm-*` class
          * references and would need restyling otherwise — the chrome is this
          * console's, the content stays as it was written.
          */}
        <main className={`wt-main${contentClass ? ` ${contentClass}` : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* The palette searches the same filtered list, so it cannot offer a
          destination the sidebar has hidden. */}
      <CommandPalette open={palette} onClose={() => setPalette(false)} nav={flat.filter(allowed)} />
      <ToastHost />
    </div>
  );
}
