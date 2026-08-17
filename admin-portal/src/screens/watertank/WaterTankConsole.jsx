import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  CloudLightning, LayoutGrid, Users, FileText, ClipboardList, FileSignature,
  Briefcase, Folder, Truck, Shield, Receipt, AlertCircle, MessageSquare,
  Settings, LogOut, Search, Banknote, ShieldCheck, ClipboardCheck, FileBarChart, Tags,
  ChevronDown, Inbox, CalendarDays, KeyRound,
} from 'lucide-react';
import api from '../../services/api';
import { ToastHost } from './common';
import CommandPalette from './CommandPalette';
import '../../styles/wt-scope.css';

/*
 * WaterTankConsole — the self-contained Water Tank Services operations console.
 * A fully SEPARATED window with its own sidebar (per the Figma design), rendered
 * outside the global admin Layout. This shell is the reusable pattern for every
 * other service line — swap NAV + brand + accent to spin up another console.
 *
 * The sidebar carries eighteen destinations. Flat, that is a wall of links you
 * read top to bottom every time; grouped, the eye lands on the section first and
 * the item second. Groups collapse and remember it, so someone who lives in
 * Delivery can shut the rest away.
 *
 * Badges count what is WAITING ON YOU, never how many rows exist. "Invoices 48"
 * is the same tomorrow whether you worked or not, so it stops being read;
 * "Invoices 9" that falls to zero as you send them is worth glancing at. The
 * counts come from /wt-ops/work-queue, the same query behind the work queue
 * itself, so the badge and the list can never disagree.
 */

const GROUP_STATE_KEY = 'wt.nav.collapsed';

export const WT_NAV_GROUPS = [
  {
    key: 'home',
    label: 'Home',
    items: [
      { to: '/water-tank', label: 'Dashboard', icon: LayoutGrid, end: true },
      { to: '/water-tank/work-queue', label: 'My Work Queue', icon: Inbox },
      { to: '/water-tank/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    key: 'intake',
    label: 'Sales & Intake',
    items: [
      { to: '/water-tank/clients', label: 'Clients', icon: Users },
      { to: '/water-tank/service-requests', label: 'Service Requests', icon: FileText },
      { to: '/water-tank/site-assessments', label: 'Site Assessments', icon: ClipboardList },
      { to: '/water-tank/quotations', label: 'Quotations', icon: FileSignature },
    ],
  },
  {
    key: 'delivery',
    label: 'Delivery',
    items: [
      { to: '/water-tank/work-orders', label: 'Work Orders', icon: Briefcase },
      { to: '/water-tank/projects', label: 'Projects', icon: Folder },
    ],
  },
  {
    key: 'contracts',
    label: 'Contracts',
    items: [
      { to: '/water-tank/agreements', label: 'Agreements', icon: FileSignature },
      { to: '/water-tank/amc', label: 'AMC', icon: Shield },
    ],
  },
  {
    key: 'providers',
    label: 'Providers',
    items: [
      { to: '/water-tank/providers', label: 'Providers', icon: Truck },
      { to: '/water-tank/compliance', label: 'Compliance & Audits', icon: ClipboardCheck },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { to: '/water-tank/invoices', label: 'Invoices', icon: Receipt, needs: 'transact' },
      { to: '/water-tank/payments', label: 'Payments & Disbursements', icon: Banknote, needs: 'transact' },
      // Reading what the business collected and spent is not a privilege
      // reserved for the people who can move the money, so no `needs`.
      { to: '/water-tank/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    key: 'assurance',
    label: 'Assurance',
    items: [
      { to: '/water-tank/service-reports', label: 'Service Reports', icon: FileBarChart },
      { to: '/water-tank/registers', label: 'Warranty & Issues', icon: ShieldCheck },
      { to: '/water-tank/complaints', label: 'Complaints', icon: AlertCircle },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      { to: '/water-tank/communication', label: 'Communication Log', icon: MessageSquare },
      { to: '/water-tank/catalogue', label: 'Price Schedule', icon: Tags, needs: 'bind' },
      { to: '/water-tank/portal-accounts', label: 'Portal Accounts', icon: KeyRound, needs: 'bind' },
      { to: '/water-tank/settings', label: 'Settings', icon: Settings },
    ],
  },
];

/*
 * The flat list is still exported: the command palette searches it, and other
 * code imports it. Deriving it from the groups means one place to add a screen.
 */
export const WT_NAV = WT_NAV_GROUPS.flatMap((g) => g.items);

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform || '');

const readCollapsed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(GROUP_STATE_KEY) || '[]')); }
  catch { return new Set(); }
};

export default function WaterTankConsole() {
  const nav = useNavigate();
  const loc = useLocation();
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [badges, setBadges] = useState({});
  /*
   * What this user may do, fetched from /wt-ops/capabilities — which reads the
   * SAME role tiers as the route guards. The UI must not keep its own copy of an
   * authorization rule; two copies is one rule and one bug waiting to happen.
   *
   * Default is permissive: until the answer arrives, every link shows. Hiding is
   * a courtesy so people are not offered doors that will not open — the API is
   * what actually refuses, and it does so regardless of what the sidebar drew.
   */
  const [can, setCan] = useState(null);

  // ⌘K / Ctrl-K opens the console-wide search from anywhere
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
   */
  const loadBadges = useCallback(() => {
    api.get('/wt-ops/work-queue')
      .then((r) => setBadges(r.data?.badges || {}))
      .catch(() => { /* counts are a convenience, never a blocker */ });
  }, []);
  useEffect(loadBadges, [loadBadges, loc.pathname]);

  // Capabilities change only when the user does, so this runs once per mount.
  useEffect(() => {
    api.get('/wt-ops/capabilities')
      .then((r) => setCan(r.data?.can || null))
      .catch(() => setCan(null));
  }, []);

  /** A destination with no `needs` is open to anyone who can reach the console. */
  const allowed = (item) => !item.needs || !can || can[item.needs];

  const toggle = (key) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    try { localStorage.setItem(GROUP_STATE_KEY, JSON.stringify([...next])); } catch { /* private mode */ }
    return next;
  });

  const Badge = ({ to }) => {
    const b = badges[to];
    if (!b?.count) return null;
    return (
      <span className={`wt-badge ${b.severity}`}
        title={b.queues.map((q) => `${q.count} ${q.label.toLowerCase()}`).join('\n')}>
        {b.count > 99 ? '99+' : b.count}
      </span>
    );
  };

  return (
    <div className="wt-scope">
      <div className="wt-shell">
        <aside className="wt-side">
          <div className="wt-brand">
            <div className="wt-brand-row">
              <span className="wt-brand-mark"><CloudLightning size={20} /></span>
              <span className="wt-brand-name">Seventh Sky</span>
            </div>
            <span className="wt-brand-sub">Water Tank Services</span>
          </div>

          <button className="wt-sidesearch" onClick={() => setPalette(true)}>
            <Search size={14} /> Search everything
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>

          <nav className="wt-nav">
            {WT_NAV_GROUPS.map((g) => {
              // Destinations this role cannot use are dropped first, so counts and
              // the "is this group empty" test are all computed on what is shown.
              const items = g.items.filter(allowed);
              if (!items.length) return null;

              const shut = collapsed.has(g.key);
              // A collapsed group must not hide work, so its total moves up to
              // the header — and the group opens if the current page is inside it.
              const inHere = items.some((i) => (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to)));
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
            <div className="wt-userfoot">
              <span className="wt-avatar">OP</span>
              <div style={{ flex: '1 0 0', minWidth: 0 }}>
                <div className="nm">Dhaka Ops Center</div>
                <div className="em">admin@seventhsky.com</div>
              </div>
            </div>
            <button className="wt-exit" onClick={() => nav('/dashboard')}><LogOut size={13} /> Back to Seventh Sky Admin</button>
          </div>
        </aside>

        <main className="wt-main">
          <Outlet />
        </main>
      </div>

      {/* The palette searches the same filtered list, so it cannot offer a
          destination the sidebar has hidden. */}
      <CommandPalette open={palette} onClose={() => setPalette(false)} nav={WT_NAV.filter(allowed)} />
      <ToastHost />
    </div>
  );
}
