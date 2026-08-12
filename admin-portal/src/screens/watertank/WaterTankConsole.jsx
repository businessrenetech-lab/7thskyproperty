import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CloudLightning, LayoutGrid, Users, FileText, ClipboardList, FileSignature,
  Briefcase, Folder, Truck, Shield, Receipt, AlertCircle, MessageSquare,
  Settings, LogOut, Search, Banknote, ShieldCheck, ClipboardCheck, FileBarChart, Tags,
} from 'lucide-react';
import { ToastHost } from './common';
import CommandPalette from './CommandPalette';
import '../../styles/wt-scope.css';

/*
 * WaterTankConsole — the self-contained Water Tank Services operations console.
 * A fully SEPARATED window with its own sidebar (per the Figma design), rendered
 * outside the global admin Layout. This shell is the reusable pattern for every
 * other service line — swap NAV + brand + accent to spin up another console.
 */

// nav item → route (base = /water-tank). Order + icons match the Figma sidebar.
export const WT_NAV = [
  { to: '/water-tank', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/water-tank/clients', label: 'Clients', icon: Users },
  { to: '/water-tank/service-requests', label: 'Service Requests', icon: FileText },
  { to: '/water-tank/site-assessments', label: 'Site Assessments', icon: ClipboardList },
  { to: '/water-tank/quotations', label: 'Quotations', icon: FileSignature },
  { to: '/water-tank/work-orders', label: 'Work Orders', icon: Briefcase },
  { to: '/water-tank/projects', label: 'Projects', icon: Folder },
  { to: '/water-tank/providers', label: 'Providers', icon: Truck },
  // One register for every document out for signature — client, provider and
  // work order — replacing the provider-only link that used to sit here.
  { to: '/water-tank/agreements', label: 'Agreements', icon: FileSignature },
  { to: '/water-tank/compliance', label: 'Compliance & Audits', icon: ClipboardCheck },
  { to: '/water-tank/reports', label: 'Service Reports', icon: FileBarChart },
  { to: '/water-tank/amc', label: 'AMC', icon: Shield },
  { to: '/water-tank/invoices', label: 'Invoices', icon: Receipt },
  { to: '/water-tank/payments', label: 'Payments & Disbursements', icon: Banknote },
  { to: '/water-tank/registers', label: 'Warranty & Issues', icon: ShieldCheck },
  { to: '/water-tank/complaints', label: 'Complaints', icon: AlertCircle },
  { to: '/water-tank/communication', label: 'Communication Log', icon: MessageSquare },
  { to: '/water-tank/catalogue', label: 'Price Schedule', icon: Tags },
  { to: '/water-tank/settings', label: 'Settings', icon: Settings },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform || '');

export default function WaterTankConsole() {
  const nav = useNavigate();
  const [palette, setPalette] = useState(false);

  // ⌘K / Ctrl-K opens the console-wide search from anywhere
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
            {WT_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'wt-nav-item' + (isActive ? ' on' : '')}>
                <n.icon /> {n.label}
              </NavLink>
            ))}
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

      <CommandPalette open={palette} onClose={() => setPalette(false)} nav={WT_NAV} />
      <ToastHost />
    </div>
  );
}
