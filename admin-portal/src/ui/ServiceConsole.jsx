import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { mayOpen, rolesOn } from '../config/access';
import { ToastHost } from '../screens/watertank/common';
import CommandPalette from '../screens/watertank/CommandPalette';
import { ShellFrame, MainNav, useShell, pageFor } from './Shell';
import '../styles/wt-scope.css';

/*
 * ServiceConsole — the shell every service line opens in.
 *
 * A service console has its own menu, accent and URL space, inside the same
 * navy sidebar and top bar as the rest of the admin (ui/Shell.jsx). The sidebar
 * shows the console's own menu; "Main menu" swaps in the admin menu in place,
 * and "Back to <console>" swaps it back, without leaving the page.
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

export default function ServiceConsole({ config }) {
  const {
    brand,                       // { name, sub, icon: Icon, accent }
    navGroups,
    storageKey,
    api: endpoints = {},         // { capabilities?, workQueue? } — both optional
    contentClass,                // e.g. 'pm-scope' for screens in the other design system
  } = config;

  const loc = useLocation();
  const shell = useShell();
  const { collapsed: rail, tipProps } = shell;
  const [view, setView] = useState('console');   // 'console' | 'main'
  useEffect(() => setView('console'), [loc.pathname]);
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
    // `needs` is one capability or a list, any of which is enough.
    if (item.needs && can && ![].concat(item.needs).some((k) => can[k])) return false;
    if (item.roles && user?.role && !rolesOn(user, item.to).some((r) => item.roles.includes(r))) return false;
    // A custom role sees only the areas it was given (config/access.js).
    if (!mayOpen(user, item.to)) return false;
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
      <span className={`ss-count ${b.severity === 'late' ? 'is-late' : ''}`}
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

  /*
   * Compared on the PATH alone. A nav item may carry a query string — Property
   * Management links several shared screens filtered by one
   * (`/property-management/work-orders?vertical=rental`) — and `pathname` never
   * contains a `?`, so comparing the raw `to` would quietly miss the current page.
   */
  const matches = (i) => {
    const path = i.to.split('?')[0];
    return i.end ? loc.pathname === path : loc.pathname.startsWith(path);
  };
  // Where the console sits in the main menu, for the breadcrumb and the console card.
  const place = pageFor(loc.pathname);
  const current = flat.filter(allowed).filter(matches).sort((a, b) => b.to.length - a.to.length)[0];
  const title = current?.label || brand.sub;
  const crumbs = place
    ? [place.section, place.group, place.label].filter((c) => c && c !== title)
    : [brand.sub].filter((c) => c !== title);

  const consoleNav = navGroups.map((g) => {
    // Destinations this role cannot use are dropped first, so counts and the
    // "is this group empty" test are computed on what is shown.
    const items = g.items.filter(allowed);
    if (!items.length) return null;

    const shut = collapsed.has(g.key);
    // A collapsed group must not hide work, so its total moves up to the header,
    // and the group opens if the current page is inside. The icon-only sidebar
    // shows every group, since its headers are just dividers there.
    const groupTotal = items.reduce((s, i) => s + (badges[i.to]?.count || 0), 0);
    const groupLate = items.some((i) => badges[i.to]?.severity === 'late');
    const open = rail || !shut || items.some(matches);

    return (
      <div key={g.key}>
        <button type="button" className="ss-section ss-section-btn" onClick={() => toggle(g.key)}
          aria-expanded={open} title={open ? `Collapse ${g.label}` : `Expand ${g.label}`}>
          {g.label}
          {!open && groupTotal > 0 && (
            <span className={`ss-count ${groupLate ? 'is-late' : ''}`}>{groupTotal > 99 ? '99+' : groupTotal}</span>
          )}
          <ChevronDown size={13} className="ss-chevron" />
        </button>
        {open && items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} {...tipProps(n.label)}
            className={({ isActive }) => `ss-item ${isActive ? 'is-current' : ''}`}>
            <n.icon size={18} /> <span className="ss-label">{n.label}</span>
            <Badge to={n.to} />
          </NavLink>
        ))}
      </div>
    );
  });

  const top = view === 'console' ? (
    <div className="ss-console-top">
      <button type="button" className="ss-back" onClick={() => setView('main')} {...tipProps('Main menu')}>
        <ArrowLeft size={16} /> <span className="ss-label">Main menu</span>
      </button>
      <div className="ss-console" {...tipProps(brand.sub)} tabIndex={rail ? 0 : undefined}>
        <span className="ss-console-mark" style={{ background: brand.accent || 'var(--ss-sky)' }}><BrandIcon size={17} /></span>
        <div className="ss-console-text">
          <strong>{brand.sub}</strong>
          {place && <span>{place.group || place.section}</span>}
        </div>
      </div>
      <button type="button" className="ss-search-btn" onClick={() => setPalette(true)} {...tipProps('Search everything')}>
        <Search size={16} /> <span className="ss-label">Search everything</span>
        <kbd className="ss-kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
    </div>
  ) : (
    <div className="ss-console-top">
      <button type="button" className="ss-back" onClick={() => setView('console')} {...tipProps(`Back to ${brand.sub}`)}>
        <ArrowLeft size={16} /> <span className="ss-label">Back to {brand.sub}</span>
      </button>
    </div>
  );

  return (
    <>
      {/*
        * `contentClass` lets a console host screens written in another design
        * system. Short Term Stay's sixteen screens carry 284 `pm-*` class
        * references and would need restyling otherwise — the chrome is the
        * shell's, the content stays as it was written.
        */}
      <ShellFrame shell={shell} title={title} crumbs={crumbs} top={top}
        nav={view === 'console' ? consoleNav : <MainNav shell={shell} />}
        mainClass={`wt-scope wt-main${contentClass ? ` ${contentClass}` : ''}`} mainStyle={theme}>
        {mayOpen(user, loc.pathname) ? <Outlet /> : (
          <div className="ss-noaccess" role="alert" style={{ padding: 48, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px' }}>Your role does not include this area</h2>
            <p style={{ margin: 0, color: 'var(--muted, #64748b)' }}>Ask an administrator to add it to your role in Users and roles.</p>
          </div>
        )}
      </ShellFrame>

      {/* The palette searches the same filtered list, so it cannot offer a
          destination the sidebar has hidden. */}
      <div className="wt-scope" style={theme}>
        <CommandPalette open={palette} onClose={() => setPalette(false)} nav={flat.filter(allowed)} />
        <ToastHost />
      </div>
    </>
  );
}
