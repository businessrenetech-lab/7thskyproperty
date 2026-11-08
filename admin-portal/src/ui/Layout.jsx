import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShellFrame, MainNav, PageFinder, useShell, pageFor } from './Shell';
import { useAuth } from '../context/AuthContext';
import { mayOpen } from '../config/access';

const TITLES = {
  '/account': 'My account',
  '/website-management': 'Website Management',
  '/website-content': 'Website Content',
  '/dashboard': 'Dashboard', '/residential/buy': 'Residential · Buy', '/residential/sell': 'Residential · Sell',
  '/property-management': 'Property Management', '/property-management/rentals': 'Rentals', '/property-management/global-invoicing': 'Global Tenant Invoicing', '/property-management/collect-rent': 'Bulk Rent Collection', '/property-management/disburse-owners': 'Bulk Owner Disbursement', '/property-management/rent-reminders': 'Bulk Rent Reminders', '/property-management/inbox': 'Communication — Inbox',
  '/property-management/applications': 'Tenant Applications', '/property-management/enquiries': 'Rental Enquiries', '/property-management/assessments': 'Rental Assessments', '/property-management/statements': 'Owner Statements', '/property-management/renewals': 'Renewals', '/property-management/vacancies': 'Vacancy Notices', '/property-management/settlements': 'Deposit Settlements', '/property-management/disbursements': 'Disbursements & Payouts', '/property-management/utilities': 'Utilities & Bills', '/property-management/tenant-requests': 'Tenant Requests', '/property-management/arrears': 'Arrears Actions', '/property-management/marketing': 'Rental Marketing', '/property-management/expense-approvals': 'Expense Approvals', '/property-management/risks': 'Risk Register', '/property-management/reports': 'Rental Reports',
  '/short-term-stay': 'Short Term Stay',
  '/commercial/buy': 'Commercial · Buy', '/commercial/sell': 'Commercial · Sell', '/services': 'Service Catalog', '/services/lines': 'Service Lines',
  '/services/lines/water-tank': 'Water Tank Services', '/services/lines/air-conditioning': 'Air Conditioning', '/services/lines/interior-design': 'Interior Design', '/services/lines/removal': 'Removal Services', '/services/lines/solar-energy': 'Solar & Energy', '/services/lines/property-care-concierge': 'Property Care & Concierge', '/services/lines/doc-verification': 'Doc Verification & Transfer',
  '/projects': 'Projects',
  '/work-orders': 'Work Orders', '/inspections': 'Inspections',
  '/contacts': 'Contacts', '/role-onboarding': 'Role Onboarding', '/clients': 'Clients', '/leads': 'Leads', '/providers': 'Service Providers',
  '/property-care': 'Property Care · Dashboard', '/property-care/work-orders': 'Work Orders & Service Tracking', '/property-care/invoicing': 'Service Invoicing', '/property-care/enquiries': 'Service Enquiries', '/property-care/leads': 'Service Leads', '/property-care/customers': 'Customer Lists', '/property-care/quotations': 'Quotations', '/property-care/amc': 'AMC Contracts',   '/consultations': 'Consultations', '/compliance': 'Compliance',
  '/rural/buy': 'Rural · Buy', '/rural/sell': 'Rural · Sell',
  '/rural/rent': 'Rural · Rent',
  '/agreements': 'Agreements', '/agreements/property-management': 'PM Agreements', '/agreements/tenancy-management': 'TM Agreements', '/agreements/short-term-rental': 'STS Agreements', '/agreements/water-tank-customer': 'WT Customer Agreements', '/agreements/water-tank-provider': 'WT Provider Agreements', '/agreement-templates': 'Agreement Templates', '/documents': 'Documents', '/signing': 'eSign Envelopes',
  '/invoices': 'Tenant Invoices', '/landlord-bills': 'Landlord Bills', '/rental-receipts': 'Rental Receipts', '/folios': 'Folios', '/account-categories': 'Account Categories', '/payments': 'Payments', '/reports': 'Reports', '/users': 'Users & Roles', '/settings': 'Settings',
};

export default function Layout() {
  const loc = useLocation();
  const { user } = useAuth();
  const nav = useNavigate();
  const shell = useShell();
  const finderRef = useRef(null);
  const { collapsed, setCollapse, setOpen } = shell;

  // Cmd/Ctrl+K opens the page finder from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (collapsed) setCollapse(false);
        setOpen(true);
        setTimeout(() => finderRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, setCollapse, setOpen]);

  const page = pageFor(loc.pathname);
  const title = TITLES[loc.pathname] || page?.label || 'Dashboard';
  const crumbs = [page?.section, page?.group, page && page.label !== title ? page.label : null].filter(Boolean);

  return (
    <ShellFrame shell={shell} title={title} crumbs={crumbs}
      top={<PageFinder inputRef={finderRef} onGo={(to) => nav(to)} />}
      nav={<MainNav shell={shell} />}>
      {mayOpen(user, loc.pathname) ? <Outlet /> : (
        <div role="alert" style={{ padding: 48, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>Your role does not include this area</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Ask an administrator to add it to your role in Users and roles.</p>
        </div>
      )}
    </ShellFrame>
  );
}
