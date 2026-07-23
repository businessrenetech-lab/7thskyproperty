import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Home, Building2, KeyRound, Layers, ChevronDown,
  Users, UserCheck, Filter, HardHat, ScrollText, FileText, FileSignature,
  Receipt, Wallet, BarChart3, Settings, ShieldCheck, LogOut, Bell, Menu, Briefcase, Wrench, ClipboardCheck, Trees, BookOpen, Tags,
} from 'lucide-react';

// Hierarchical nav. Items with `children` are collapsible groups.
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'CRM' },
  { key: 'residential', label: 'Residential', icon: Home, children: [
    { to: '/residential/buy', label: 'Buy' },
    { to: '/residential/sell', label: 'Sell' },
    { to: '/compliance?category=residential', label: 'Compliance' },
    { to: '/projects?vertical_key=properties', label: 'Checklists / Workflows' },
  ] },
  { key: 'pm', label: 'Property Management', icon: KeyRound, children: [
    { to: '/property-management', label: 'Dashboard' },
    { label: 'Rentals', group: true },
    { to: '/property-management/rentals', label: 'Properties' },
    { to: '/work-orders?vertical=rental', label: 'Maintenance / Work Orders' },
    { to: '/property-management/enquiries', label: 'Rental Enquiries' },
    { to: '/property-management/applications', label: 'Tenant Applications' },
    { to: '/property-management/vacancies', label: 'Vacancy Notices' },
    { to: '/inspections?type=rental', label: 'Rental Inspections' },
    { to: '/compliance?listing_type=rent', label: 'Compliances' },
    { to: '/projects?vertical_key=leasing,short_stay', label: 'Workflows' },
    { label: 'Rental Accounting', group: true },
    { to: '/landlord-bills', label: 'Landlord Bills' },
    { to: '/invoices?kind=client', label: 'Tenant Invoices' },
    { to: '/folios', label: 'Folios' },
    { to: '/property-management/disbursements', label: 'Disbursement & Payouts' },
    { to: '/rental-receipts', label: 'Rental Receipts' },
    { to: '/property-management/statements', label: 'Owner Statements' },
    { to: '/property-management/settlements', label: 'Deposit Settlements' },
    { label: 'Others', group: true },
    { to: '/property-management/assessments', label: 'Rental Assessments' },
    { to: '/property-management/renewals', label: 'Renewals' },
    { to: '/property-management/utilities', label: 'Utilities & Bills' },
    { to: '/property-management/tenant-requests', label: 'Tenant Requests' },
    { to: '/property-management/arrears', label: 'Arrears Actions' },
    { to: '/property-management/marketing', label: 'Rental Marketing' },
    { to: '/property-management/expense-approvals', label: 'Expense Approvals' },
    { to: '/property-management/risks', label: 'Risk Register' },
    { to: '/property-management/reports', label: 'Reports' },
    { to: '/property-management/global-invoicing', label: 'Global Tenant Invoicing' },
  ] },
  { key: 'commercial', label: 'Commercial', icon: Building2, children: [
    { to: '/commercial/buy', label: 'Buy' },
    { to: '/commercial/sell', label: 'Sell' },
    { to: '/compliance?category=commercial', label: 'Compliance' },
    { to: '/projects?vertical_key=commercial_rent,commercial_sale', label: 'Checklists / Workflows' },
  ] },
  { key: 'rural', label: 'Rural Properties', icon: Trees, children: [
    { to: '/rural/buy', label: 'Buy' },
    { to: '/rural/sell', label: 'Sell' },
    { to: '/compliance?category=rural', label: 'Compliance' },
    { to: '/projects?vertical_key=rural_rent,rural_sale', label: 'Checklists / Workflows' },
  ] },
  { key: 'care', label: 'Property Care Services', icon: Layers, children: [
    { to: '/property-care', label: 'Dashboard' },
    { to: '/property-care/enquiries', label: 'Enquiries' },
    { to: '/property-care/leads', label: 'Leads' },
    { to: '/property-care/quotations', label: 'Quotations' },
    { to: '/property-care/customers', label: 'Customer Lists' },
    { to: '/services', label: 'Services' },
    { to: '/providers', label: 'Service Providers' },
    { to: '/property-care/work-orders', label: 'Work Orders & Service Tracking' },
    { to: '/property-care/amc', label: 'AMC Contracts' },
    { to: '/property-care/invoicing', label: 'Invoicing' },
    { to: '/property-care/payments', label: 'Payments & Disbursements' },
    { to: '/property-care/registers', label: 'Warranty & Issues' },
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
  '/commercial/buy': 'Commercial · Buy', '/commercial/sell': 'Commercial · Sell', '/services': 'Property Care Services', '/services/lines': 'Service Lines',
  '/projects': 'Projects',
  '/work-orders': 'Work Orders', '/inspections': 'Inspections',
  '/contacts': 'Contacts', '/role-onboarding': 'Role Onboarding', '/clients': 'Clients', '/leads': 'Leads', '/providers': 'Service Providers',
  '/property-care': 'Property Care · Dashboard', '/property-care/work-orders': 'Work Orders & Service Tracking', '/property-care/invoicing': 'Service Invoicing', '/property-care/payments': 'Payments & Disbursements', '/property-care/enquiries': 'Service Enquiries', '/property-care/leads': 'Service Leads', '/property-care/customers': 'Customer Lists', '/property-care/quotations': 'Quotations', '/property-care/amc': 'AMC Contracts', '/property-care/registers': 'Warranty & Issues',
  '/consultations': 'Consultations', '/compliance': 'Compliance',
  '/rural/buy': 'Rural · Buy', '/rural/sell': 'Rural · Sell',
  '/agreements': 'Agreements', '/agreement-templates': 'Agreement Templates', '/documents': 'Documents', '/signing': 'eSign Envelopes',
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
                  <div className={`nav-item ${isOpen ? '' : ''}`} onClick={() => toggle(n.key)}>
                    <n.icon size={18} /> {n.label}
                    <ChevronDown size={15} style={{ marginLeft: 'auto', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                  </div>
                  {isOpen && (
                    <div style={{ marginLeft: 14, paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>
                      {n.children.map((c, ci) => c.group ? (
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
