import {
  CloudLightning, LayoutGrid, Users, FileText, ClipboardList, FileSignature,
  Briefcase, Folder, Truck, Shield, Receipt, AlertCircle, MessageSquare,
  Settings, Banknote, ShieldCheck, ClipboardCheck, FileBarChart, Tags,
  Inbox, CalendarDays, KeyRound,
  Hotel, CalendarRange, MessageSquareQuote, BookOpen, UserCheck, DoorOpen,
  Home, Sparkles, Wrench, HandCoins, Landmark, BarChart3,
} from 'lucide-react';

/*
 * consoles.js — one entry per service line.
 *
 * Every service line opens as a SEPARATED operations console: its own sidebar,
 * its own accent, its own URL space, rendered outside the global admin Layout.
 * `ui/ServiceConsole.jsx` is the shell; this file is the only thing that differs
 * between one console and the next. Adding Property Management or Residential
 * Sales later means adding an object here and a route block in App.jsx.
 *
 * Item shape:
 *   { to, label, icon, end?, needs?, roles? }
 *
 *   needs  — a capability key from the console's /capabilities endpoint
 *            (Water Tank's read/operate/transact/bind/administer tiers)
 *   roles  — a plain role list, for consoles with no capabilities endpoint yet
 *
 * Both fail open. Hiding a link is a courtesy so people are not offered doors
 * that will not open; the API is what refuses.
 */

/* ── Water Tank ────────────────────────────────────────────────────────── */

export const WATER_TANK_NAV = [
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

export const waterTankConsole = {
  slug: 'water-tank',
  storageKey: 'wt.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Water Tank Services',
    icon: CloudLightning,
    accent: '#12b6f3',           // the original cyan — unchanged
    accentStrong: '#0e93c9',
    accentInk: '#0b7bb0',
    accentTint: 'rgba(18,182,243,.12)',
    accentTint2: '#dcf3fd',
  },
  navGroups: WATER_TANK_NAV,
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Short Term Stay ───────────────────────────────────────────────────── */

/*
 * Sixteen destinations across six groups, lifted from the grouping the module
 * already used in ui/Layout.jsx — plus the two screens that existed with
 * nowhere to click them from:
 *
 *   Owner disbursement — a working bulk-payout screen reachable only from a
 *                        button on Payments.
 *   STS Agreements     — the SSPC-STRMS-01 builder, filed under the global
 *                        "Documents & Signing" section away from its own module.
 *
 * `roles:` values are carried over exactly as they were, so nobody gains or
 * loses access in the move.
 */
const FINANCE_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];

export const SHORT_STAY_NAV = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { to: '/short-stay', label: 'Dashboard', icon: LayoutGrid, end: true },
      { to: '/short-stay/availability', label: 'Availability', icon: CalendarRange },
    ],
  },
  {
    key: 'guests',
    label: 'Guests & Bookings',
    items: [
      { to: '/short-stay/enquiries', label: 'Enquiries', icon: MessageSquareQuote },
      { to: '/short-stay/bookings', label: 'Bookings', icon: BookOpen },
      { to: '/short-stay/guests', label: 'Guests', icon: UserCheck },
      {
        to: '/short-stay/checkin',
        label: 'Check-In / Out',
        icon: DoorOpen,
        roles: ['super_admin', 'branch_admin', 'property_manager'],
      },
    ],
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    items: [
      { to: '/short-stay/properties', label: 'Properties', icon: Home },
      { to: '/short-stay/housekeeping', label: 'Housekeeping', icon: Sparkles },
      { to: '/short-stay/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    key: 'agreements',
    label: 'Agreements',
    items: [
      { to: '/short-stay/owner-agreements', label: 'Owner agreements', icon: FileSignature },
      { to: '/short-stay/guest-agreements', label: 'Guest agreements', icon: FileText },
      { to: '/short-stay/agreements', label: 'STS Agreements', icon: ClipboardList },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { to: '/short-stay/payments', label: 'Payments', icon: Receipt, roles: FINANCE_ROLES },
      { to: '/short-stay/owner-disbursement', label: 'Owner disbursement', icon: HandCoins, roles: FINANCE_ROLES },
      { to: '/short-stay/owner-statements', label: 'Owner statements', icon: Landmark, roles: FINANCE_ROLES },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    items: [
      { to: '/short-stay/reports', label: 'Reports', icon: BarChart3, roles: FINANCE_ROLES },
      { to: '/short-stay/settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'branch_admin'] },
    ],
  },
];

export const shortStayConsole = {
  slug: 'short-stay',
  storageKey: 'ss.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Short Term Stay',
    icon: Hotel,
    // Amber over the same navy sidebar: the layout is identical to Water Tank's
    // so the product reads as one system, and the accent is what tells an
    // operator at a glance which console they are standing in.
    accent: '#f59e0b',
    accentStrong: '#d97706',
    accentInk: '#b45309',
    accentTint: 'rgba(245,158,11,.12)',
    accentTint2: '#fef3c7',
  },
  navGroups: SHORT_STAY_NAV,
  /*
   * No capabilities or work-queue endpoints yet — Short Term Stay has no
   * equivalent of /wt-ops. The shell simply shows no badges, rather than
   * erroring, and the nav gates on `roles:` instead. Both light up the day
   * those endpoints exist.
   */
  api: {},
  // The sixteen screens are written in the pm-design system, not the console's.
  contentClass: 'pm-scope',
  exitTo: '/dashboard',
};

export const CONSOLES = {
  'water-tank': waterTankConsole,
  'short-stay': shortStayConsole,
};
