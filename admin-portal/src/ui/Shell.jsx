import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Contact, Home, Building2, Briefcase, Trees, Sofa, AirVent, Droplets,
  FileSearch, ConciergeBell, Truck, Calculator, Globe, Settings, ChevronDown, Menu, Search,
  PanelLeftClose, PanelLeftOpen, Building, IdCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoMark from '../assets/logo-mark.png';
import { Clock, Notifications, ProfileMenu } from './ShellParts';
import { useButtonColor } from './appearance';
import { mayOpen } from '../config/access';
import '../styles/shell.css';

/*
 * The admin shell, shared by the main admin pages (ui/Layout.jsx) and every
 * service console (ui/ServiceConsole.jsx): one navy sidebar, one top bar.
 * Design: docs/design/admin-shell.figcraft.
 */

/*
 * The main menu names each business line once. A line's own screens live in
 * its console's sidebar, so they are not repeated here. A group's `children`
 * are its destinations; groups open one at a time, and the group holding the
 * current page opens by itself.
 */
export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'crm', label: 'CRM', icon: Contact, children: [
    { to: '/contacts', label: 'Contacts' },
    { to: '/clients', label: 'Clients' },
    { to: '/leads', label: 'Leads' },
    { to: '/providers', label: 'Service Providers' },
    { to: '/role-onboarding', label: 'Role Onboarding' },
    { to: '/agreements', label: 'Agreements' },
    { to: '/signing', label: 'eSign Envelopes' },
    { to: '/documents', label: 'Documents' },
  ] },

  { section: 'Operations' },
  { key: 'residential', label: 'Residential', icon: Home, children: [
    { to: '/property-management', label: 'Property Management' },
    { to: '/residential/sell', label: 'Sell' },
    { to: '/residential/buyer-service', label: 'Buy' },
    { to: '/short-stay', label: 'Short Term Stay' },
  ] },
  { key: 'commercial', label: 'Commercial', icon: Building2, children: [
    { to: '/commercial/rent', label: 'Rent' },
    { to: '/commercial/sell', label: 'Sale' },
  ] },
  { key: 'business', label: 'Business', icon: Briefcase, children: [
    { to: '/business/buyer-service', label: 'Buy' },
    { to: '/business/sell', label: 'Sale' },
    { to: '/business-rent', label: 'Rent' },
    { to: '/business-registration', label: 'Registration' },
  ] },
  { key: 'rural', label: 'Rural', icon: Trees, children: [
    { to: '/rural/rent', label: 'Rent' },
    { to: '/rural/sell', label: 'Sale' },
  ] },
  { key: 'interior', label: 'Interior Design', icon: Sofa, children: [
    { to: '/residential-interior-design', label: 'Residential Interior' },
    { to: '/commercial-interior-design', label: 'Commercial Interior' },
    { to: '/fitness-room-interior-design', label: 'Fitness Room Interior' },
    { to: '/prayer-room-interior-design', label: 'Prayer Room Interior' },
    { to: '/custom-design-fit-out', label: 'Custom Design & Fit-Out' },
    { to: '/furniture-styling-consultation', label: 'Furniture & Styling' },
    { to: '/space-planning-renovation', label: 'Space Planning & Renovation' },
  ] },
  { to: '/air-conditioning', label: 'Air Conditioning', icon: AirVent },
  { to: '/water-tank', label: 'Water Tank Cleaning', icon: Droplets },
  { key: 'doc-verification', label: 'Doc Verification & Transfer', icon: FileSearch, children: [
    { to: '/land-property-assessment', label: 'Land & Property Assessment' },
    { to: '/loan-financial-support', label: 'Loan & Financial Support' },
    { to: '/property-documentation-verification', label: 'Documentation & Verification' },
    { to: '/property-will-succession', label: 'Will & Succession' },
  ] },
  { to: '/property-care-concierge', label: 'Property Care & Concierge', icon: ConciergeBell },
  { to: '/removal-relocation', label: 'Removal & Relocation', icon: Truck },

  { section: 'Management' },
  { to: '/hr', label: 'Human Resources', icon: IdCard },
  // Interim: the existing finance screens. Replaced by the global accounting
  // module once every business line posts to the general ledger.
  { key: 'accounting', label: 'Accounting', icon: Calculator, children: [
    { to: '/invoices', label: 'Tenant Invoices' },
    { to: '/landlord-bills', label: 'Landlord Bills' },
    { to: '/rental-receipts', label: 'Rental Receipts' },
    { to: '/payments', label: 'Payments' },
    { to: '/folios', label: 'Folios' },
    { to: '/account-categories', label: 'Account Categories' },
    { to: '/reports', label: 'Reports' },
  ] },
  { key: 'website', label: 'Website Management', icon: Globe, children: [
    { to: '/website-management', label: 'Listings & Pages' },
    { to: '/website-content', label: 'Content' },
  ] },
  { key: 'settings', label: 'Global Settings', icon: Settings, children: [
    { to: '/settings', label: 'System Settings' },
    { to: '/users', label: 'Users & Roles', roles: ['super_admin', 'branch_admin'] },
    { to: '/agreement-templates', label: 'Agreement Templates' },
    { to: '/services', label: 'Service Catalog' },
  ] },
];

// A destination is current on its own URL and on anything beneath it.
export const isCurrent = (path, to) => path === to || path.startsWith(to + '/');
export const groupFor = (path) => NAV.find((n) => n.children?.some((c) => isCurrent(path, c.to)))?.key ?? null;

// Every destination with the section and group it sits in: the breadcrumb and the page finder read this.
export const PAGES = (() => {
  const out = [];
  let section = null;
  NAV.forEach((n) => {
    if (n.section) { section = n.section; return; }
    if (n.children) n.children.forEach((c) => out.push({ ...c, group: n.label, section }));
    else out.push({ to: n.to, label: n.label, section });
  });
  return out;
})();
export const pageFor = (path) => PAGES.filter((p) => isCurrent(path, p.to)).sort((a, b) => b.to.length - a.to.length)[0];

const COLLAPSE_KEY = 'ss-sidebar';

/* Sidebar state: icon-only on desktop (remembered), drawer on phones, and hover names for the icons. */
export function useShell() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'collapsed'; } catch { return false; }
  });
  const [tip, setTip] = useState(null);
  useEffect(() => { setOpen(false); setTip(null); }, [loc.pathname]);

  const setCollapse = useCallback((v) => {
    setCollapsed(v); setTip(null);
    try { localStorage.setItem(COLLAPSE_KEY, v ? 'collapsed' : 'open'); } catch { /* per-browser preference only */ }
  }, []);

  const show = (label) => (e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ label, y: r.top + r.height / 2 }); };
  const tipProps = (label) => (collapsed ? {
    onMouseEnter: show(label), onFocus: show(label),
    onMouseLeave: () => setTip(null), onBlur: () => setTip(null),
    'aria-label': label,
  } : {});

  return { open, setOpen, collapsed, setCollapse, tip, setTip, tipProps };
}

export function PageFinder({ inputRef, onGo }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return PAGES.filter((p) => [p.label, p.group, p.section].join(' ').toLowerCase().includes(t)).slice(0, 8);
  }, [q]);
  useEffect(() => setSel(0), [q]);
  const go = (p) => { if (!p) return; setQ(''); inputRef.current?.blur(); onGo(p.to); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[sel]); }
    else if (e.key === 'Escape') { setQ(''); inputRef.current?.blur(); }
  };
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <div className="ss-finder">
      <div className="ss-finder-box">
        <Search size={16} aria-hidden="true" />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Jump to a page" aria-label="Jump to a page" role="combobox"
          aria-expanded={!!q.trim()} aria-controls="ss-finder-list" aria-autocomplete="list" />
        {!q && <span className="ss-kbd" aria-hidden="true">{isMac ? '⌘K' : 'Ctrl K'}</span>}
      </div>
      {q.trim() && (hits.length ? (
        <ul className="ss-finder-results" id="ss-finder-list" role="listbox">
          {hits.map((p, i) => (
            <li key={p.to} role="option" aria-selected={i === sel}
              onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); go(p); }}>
              {p.label}
              {(p.group || p.section) && <span>{[p.section, p.group].filter(Boolean).join(' / ')}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="ss-finder-results ss-finder-empty" id="ss-finder-list">No page matches “{q.trim()}”.</div>
      ))}
    </div>
  );
}

/* The main menu: one group open at a time, and the group holding the current page opens by itself. */
export function MainNav({ shell }) {
  const { user } = useAuth();
  const loc = useLocation();
  const { collapsed, setCollapse, tipProps } = shell;
  const activeGroup = groupFor(loc.pathname);
  const [openGroup, setOpenGroup] = useState(activeGroup);
  // Arriving at a page from elsewhere (a dashboard card, a link) opens its group.
  useEffect(() => { if (activeGroup) setOpenGroup(activeGroup); }, [activeGroup]);

  return NAV.map((n, i) => {
    if (n.section) return <div className="ss-section" key={'s' + i}>{n.section}</div>;
    if (n.children) {
      const items = n.children.filter((c) => (!c.roles || c.roles.includes(user?.role)) && mayOpen(user, c.to));
      if (!items.length) return null;
      const isOpen = openGroup === n.key && !collapsed;
      const holds = activeGroup === n.key;
      return (
        <div key={n.key}>
          <button type="button" aria-expanded={isOpen} {...tipProps(n.label)}
            className={`ss-item ${isOpen ? 'is-open' : ''} ${collapsed && holds ? 'is-current' : ''}`}
            onClick={() => {
              if (collapsed) { setCollapse(false); setOpenGroup(n.key); return; }
              setOpenGroup(isOpen ? null : n.key);
            }}>
            <n.icon size={18} /> <span className="ss-label">{n.label}</span>
            <ChevronDown size={14} className="ss-chevron" />
          </button>
          {isOpen && (
            <div className="ss-sub">
              {items.map((c) => {
                const cur = isCurrent(loc.pathname, c.to);
                return (
                  <NavLink key={c.to} to={c.to} className={() => (cur ? 'is-current' : '')} aria-current={cur ? 'page' : undefined}>
                    {c.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    if (!mayOpen(user, n.to)) return null;
    const cur = isCurrent(loc.pathname, n.to);
    return (
      <NavLink key={n.to} to={n.to} {...tipProps(n.label)}
        className={() => `ss-item ${cur ? 'is-current' : ''}`} aria-current={cur ? 'page' : undefined}>
        <n.icon size={18} /> <span className="ss-label">{n.label}</span>
      </NavLink>
    );
  });
}

/*
 * The frame: sidebar (brand, `top`, `nav`, branch), top bar (breadcrumb, title,
 * clock, notifications, profile) and the page. `mainClass`/`mainStyle` let a
 * console wrap its screens in their own design system.
 */
export function ShellFrame({ shell, top, nav, crumbs = [], title, mainClass = 'ss-content', mainStyle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen, collapsed, setCollapse, tip, setTip, tipProps } = shell;
  useButtonColor();
  const [branchOrg, branchName] = useMemo(() => {
    const parts = (user?.Branch?.name || '').split(' — ');
    return parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [null, parts[0]];
  }, [user?.Branch?.name]);

  return (
    <div className={`ss ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className={`ss-side ${open ? 'is-open' : ''}`} aria-label="Main menu">
        <div className="ss-brand">
          <img src={logoMark} alt="" />
          <div className="ss-brand-text">
            <div className="ss-brand-name">Seventh Sky</div>
            <div className="ss-brand-sub">Property Care</div>
          </div>
          <button type="button" className="ss-rail-btn ss-collapse-btn" onClick={() => setCollapse(!collapsed)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        {top}
        <nav className="ss-nav" onScroll={() => setTip(null)}>{nav}</nav>
        {branchName && (
          <div className="ss-foot" {...tipProps(branchName)} tabIndex={collapsed ? 0 : undefined}>
            <Building size={18} aria-hidden="true" />
            <div><strong>{branchName}</strong>{branchOrg && <span>{branchOrg}</span>}</div>
          </div>
        )}
      </aside>
      <div className={`ss-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      {tip && <div className="ss-tip" style={{ top: tip.y }} role="tooltip">{tip.label}</div>}

      <div className="ss-main">
        <header className="ss-top">
          <button type="button" className="ss-tool-btn ss-mobile" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <img className="ss-top-logo ss-mobile" src={logoMark} alt="" />
          <div className="ss-heading">
            {crumbs.length > 0 && <div className="ss-crumbs">{crumbs.map((c) => <span key={c}>{c}</span>)}</div>}
            <h1>{title}</h1>
          </div>
          <div className="ss-tools">
            <Clock />
            <span className="ss-divider" aria-hidden="true" />
            <Notifications />
            <span className="ss-divider" aria-hidden="true" />
            <ProfileMenu user={user} onSignOut={async () => { await logout(); navigate('/login'); }} />
          </div>
        </header>
        <main className={mainClass} style={mainStyle}>{children}</main>
      </div>
    </div>
  );
}
