import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Home, Building2, KeyRound, Hotel, Layers, ChevronDown,
  Users, UserCheck, Filter, HardHat, ScrollText, FileText, FileSignature,
  Receipt, Wallet, BarChart3, Settings, ShieldCheck, LogOut, Bell, Menu, Briefcase, Wrench, ClipboardCheck, Trees, BookOpen, Tags,
} from 'lucide-react';

// Hierarchical nav. Items with `children` are collapsible groups.
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'CRM' },
  /*
   * Residential Sales is its own operations console now, so it appears here as
   * a single destination. Commercial and Rural still use the shared screens and
   * keep their grouped entries below.
   */
  { to: '/residential/sell', label: 'Residential', icon: Home },
  /*
   * Property Management is its own operations console now, so it appears here as
   * a single destination — as Water Tank Services and Short Term Stay do. Its
   * twenty-seven screens live in that console's own sidebar rather than being
   * repeated in this one.
   */
  { to: '/property-management', label: 'Property Management', icon: KeyRound },
  /*
   * Short Term Stay is its own operations console now, so it appears here as a
   * single destination — exactly as Water Tank Services does under Services.
   * Its sixteen screens live in that console's own sidebar rather than being
   * repeated in this one.
   */
  { to: '/short-stay', label: 'Short Term Stay', icon: Hotel },
  { key: 'commercial', label: 'Commercial', to: '/commercial/sell', icon: Building2, children: [
    { to: '/commercial/sell', label: 'Sales / Sell Dashboard' },
    { to: '/commercial/buy', label: 'Buy' },
    { to: '/commercial/enquiry', label: 'Buyer Enquiries' },
    { to: '/compliance?category=commercial', label: 'Compliance' },
    { to: '/projects?vertical_key=commercial_rent,commercial_sale', label: 'Checklists / Workflows' },
  ] },
  { key: 'rural', label: 'Rural Properties', to: '/rural/sell', icon: Trees, children: [
    { to: '/rural/sell', label: 'Sales / Sell Dashboard' },
    { to: '/rural/buy', label: 'Buy' },
    { to: '/rural/enquiry', label: 'Buyer Enquiries' },
    { to: '/compliance?category=rural', label: 'Compliance' },
    { to: '/projects?vertical_key=rural_rent,rural_sale', label: 'Checklists / Workflows' },
  ] },
  { key: 'care', label: 'Services', icon: Layers, children: [
    { group: true, label: 'Service Lines' },
    { to: '/water-tank', label: 'Water Tank Services' },
    { to: '/air-conditioning', label: 'Air Conditioning' },
    { to: '/services/lines/interior-design', label: 'Interior Design' },
    { to: '/services/lines/removal', label: 'Removal Services' },
    { to: '/services/lines/solar-energy', label: 'Solar & Energy' },
    { to: '/services/lines/property-care-concierge', label: 'Property Care & Concierge' },
    { to: '/services/lines/doc-verification', label: 'Doc Verification & Transfer' },
    { group: true, label: 'Shared operations' },
    { to: '/property-care', label: 'Dashboard' },
    { to: '/property-care/enquiries', label: 'Enquiries' },
    { to: '/property-care/leads', label: 'Leads' },
    { to: '/property-care/quotations', label: 'Quotations' },
    { to: '/property-care/customers', label: 'Customer Lists' },
    { to: '/services', label: 'Service Catalog' },
    { to: '/providers', label: 'Service Providers' },
    { to: '/property-care/work-orders', label: 'Work Orders & Service Tracking' },
    { to: '/property-care/amc', label: 'AMC Contracts' },
    { to: '/property-care/invoicing', label: 'Invoicing' },
    // Payments & Disbursements and Warranty & Issues now live in the Water Tank
    // console (/water-tank/payments, /water-tank/registers); the old
    // /property-care/* URLs redirect there.
  ] },
  { to: '/consultations', label: 'Consultations', icon: ClipboardCheck },
  { section: 'Operations' },
  { to: '/projects', label: 'Projects', icon: Briefcase },
  { to: '/work-orders', label: 'Work Orders', icon: Wrench },
  { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { section: 'Directory' },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/role-onboarding', label: 'Role Onboarding', icon: UserCheck },
  { to: '/clients', label: 'Clients', icon: UserCheck },
  { to: '/leads', label: 'Leads', icon: Filter },
  { section: 'Documents & Signing' },
  { to: '/agreements', label: 'Agreements', icon: ScrollText },
  /*
   * The per-vertical agreement builders now live in their own consoles, beside
   * the screens they are about — a property manager drafting a tenancy
   * agreement should not have to leave Property Management to do it. They are
   * still listed here because this section is where someone looks for "all our
   * agreements", and the links point straight at their new homes rather than
   * bouncing through a redirect.
   */
  { to: '/property-management/agreements', label: 'PM Agreements', icon: FileSignature },
  { to: '/property-management/tenancy-agreements', label: 'TM Agreements', icon: FileSignature },
  { to: '/short-stay/agreements', label: 'STS Agreements', icon: FileSignature },
  { to: '/water-tank/agreements/customer', label: 'WT Customer Agreements', icon: FileSignature },
  { to: '/water-tank/agreements/provider', label: 'WT Provider Agreements', icon: FileSignature },
  { to: '/agreement-templates', label: 'Agreement Templates', icon: FileSignature },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/signing', label: 'eSign Envelopes', icon: FileSignature },
  { section: 'Finance' },
  { to: '/invoices', label: 'Tenant Invoices', icon: Receipt },
  { to: '/landlord-bills', label: 'Landlord Bills', icon: Wrench },
  { to: '/rental-receipts', label: 'Rental Receipts', icon: FileText },
  { to: '/folios', label: 'Folios', icon: BookOpen },
  { to: '/account-categories', label: 'Account Categories', icon: Tags },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { section: 'Administration' },
  { to: '/users', label: 'Users & Roles', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TITLES = {
  '/dashboard': 'Dashboard', '/residential/buy': 'Residential · Buy', '/residential/sell': 'Residential · Sell',
  '/property-management': 'Property Management', '/property-management/rentals': 'Rentals', '/property-management/global-invoicing': 'Global Tenant Invoicing',
  '/property-management/applications': 'Tenant Applications', '/property-management/enquiries': 'Rental Enquiries', '/property-management/assessments': 'Rental Assessments', '/property-management/statements': 'Owner Statements', '/property-management/renewals': 'Renewals', '/property-management/vacancies': 'Vacancy Notices', '/property-management/settlements': 'Deposit Settlements', '/property-management/disbursements': 'Disbursements & Payouts', '/property-management/utilities': 'Utilities & Bills', '/property-management/tenant-requests': 'Tenant Requests', '/property-management/arrears': 'Arrears Actions', '/property-management/marketing': 'Rental Marketing', '/property-management/expense-approvals': 'Expense Approvals', '/property-management/risks': 'Risk Register', '/property-management/reports': 'Rental Reports',
  '/short-term-stay': 'Short Term Stay',
  '/commercial/buy': 'Commercial · Buy', '/commercial/sell': 'Commercial · Sell', '/services': 'Service Catalog', '/services/lines': 'Service Lines',
  '/services/lines/water-tank': 'Water Tank Services', '/services/lines/air-conditioning': 'Air Conditioning', '/services/lines/interior-design': 'Interior Design', '/services/lines/removal': 'Removal Services', '/services/lines/solar-energy': 'Solar & Energy', '/services/lines/property-care-concierge': 'Property Care & Concierge', '/services/lines/doc-verification': 'Doc Verification & Transfer',
  '/projects': 'Projects',
  '/work-orders': 'Work Orders', '/inspections': 'Inspections',
  '/contacts': 'Contacts', '/role-onboarding': 'Role Onboarding', '/clients': 'Clients', '/leads': 'Leads', '/providers': 'Service Providers',
  '/property-care': 'Property Care · Dashboard', '/property-care/work-orders': 'Work Orders & Service Tracking', '/property-care/invoicing': 'Service Invoicing', '/property-care/enquiries': 'Service Enquiries', '/property-care/leads': 'Service Leads', '/property-care/customers': 'Customer Lists', '/property-care/quotations': 'Quotations', '/property-care/amc': 'AMC Contracts',   '/consultations': 'Consultations', '/compliance': 'Compliance',
  '/rural/buy': 'Rural · Buy', '/rural/sell': 'Rural · Sell',
  '/agreements': 'Agreements', '/agreements/property-management': 'PM Agreements', '/agreements/tenancy-management': 'TM Agreements', '/agreements/short-term-rental': 'STS Agreements', '/agreements/water-tank-customer': 'WT Customer Agreements', '/agreements/water-tank-provider': 'WT Provider Agreements', '/agreement-templates': 'Agreement Templates', '/documents': 'Documents', '/signing': 'eSign Envelopes',
  '/invoices': 'Tenant Invoices', '/landlord-bills': 'Landlord Bills', '/rental-receipts': 'Rental Receipts', '/folios': 'Folios', '/account-categories': 'Account Categories', '/payments': 'Payments', '/reports': 'Reports', '/users': 'Users & Roles', '/settings': 'Settings',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  // Which collapsible groups are expanded (auto-open the one matching the route)
  const activeGroup = NAV.find((n) => n.children?.some((c) => loc.pathname.startsWith(c.to)))?.key;
  const [expanded, setExpanded] = useState(() => (activeGroup ? { [activeGroup]: true } : {}));
  const toggle = (k) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  const title = TITLES[loc.pathname] || 'Dashboard';
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo">7S</div>
          <div><div className="name">Seventh Sky</div><div className="sub">Property Care</div></div>
        </div>
        <nav className="nav">
          {NAV.map((n, i) => {
            if (n.section) return <div className="nav-section" key={'s' + i}>{n.section}</div>;
            if (n.children) {
              const isOpen = !!expanded[n.key];
              return (
                <div key={n.key}>
                  <div
                    className={`nav-item ${loc.pathname.startsWith('/' + n.key) || (n.to && loc.pathname === n.to) ? 'active' : ''}`}
                    onClick={() => {
                      if (!expanded[n.key]) toggle(n.key);
                      if (n.to) nav(n.to);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <n.icon size={18} /> {n.label}
                    <ChevronDown size={15} style={{ marginLeft: 'auto', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                  </div>
                  {isOpen && (
                    <div style={{ marginLeft: 14, paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>
                      {n.children.filter((c) => !c.roles || c.roles.includes(user?.role)).map((c, ci) => c.group ? (
                        <div key={`${n.key}-group-${ci}`} style={{
                          margin: ci === 0 ? '4px 0 6px' : '14px 0 6px',
                          padding: '6px 10px',
                          borderLeft: '3px solid var(--primary)',
                          borderRadius: 8,
                          background: 'var(--primary-glow)',
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                        }}>{c.label}</div>
                      ) : (
                        <NavLink key={c.to} to={c.to} onClick={() => setOpen(false)}
                          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ fontSize: 13 }}>
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <n.icon size={18} /> {n.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon mobile-only" onClick={() => setOpen((o) => !o)}><Menu size={18} /></button>
          <div><h1>{title}</h1><div className="crumb">Seventh Sky Property Care · Admin</div></div>
          <div className="topbar-spacer" />
          <button className="btn btn-ghost btn-icon" title="Notifications"><Bell size={18} /></button>
          <div className="row">
            <div className="avatar" title={user?.email}>{initials}</div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{(user?.role || '').replace(/_/g, ' ')}</div>
            </div>
            <button className="btn btn-ghost btn-icon" title="Sign out" onClick={async () => { await logout(); nav('/login'); }}><LogOut size={17} /></button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
