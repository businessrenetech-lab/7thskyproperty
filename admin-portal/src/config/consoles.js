import {
  CloudLightning, LayoutGrid, Users, FileText, ClipboardList, FileSignature,
  Briefcase, Folder, Truck, Shield, Receipt, AlertCircle, MessageSquare,
  Settings, Banknote, ShieldCheck, ClipboardCheck, FileBarChart, Tags,
  Inbox, CalendarDays, KeyRound,
  Hotel, CalendarRange, MessageSquareQuote, BookOpen, UserCheck, DoorOpen,
  Home, Sparkles, Wrench, HandCoins, Landmark, BarChart3, TrendingUp,
  Ruler, FolderArchive, Boxes, Plug,
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
    label: 'Delivery & Contracts',
    items: [
      // A project is the delivery container; its work orders live inside it
      // (Project → Work Orders tab). Projects lead so the containment reads.
      { to: '/water-tank/projects', label: 'Projects', icon: Folder },
      { to: '/water-tank/work-orders', label: 'Work Orders', icon: Briefcase },
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
    label: 'Assurance & Admin',
    items: [
      { to: '/water-tank/service-reports', label: 'Service Reports', icon: FileBarChart },
      { to: '/water-tank/registers', label: 'Warranty & Issues', icon: ShieldCheck },
      { to: '/water-tank/complaints', label: 'Complaints', icon: AlertCircle },
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

/* ── Property Management ───────────────────────────────────────────────── */

/*
 * Twenty-seven destinations across seven groups, from the three flat sub-groups
 * the module used in ui/Layout.jsx (Rentals · Rental Accounting · Others).
 *
 * "Rental Accounting" held ten items, which is a list you read rather than scan,
 * so it is split by DIRECTION: money coming in from tenants, money going out to
 * landlords and suppliers. An operator chasing arrears and an operator paying an
 * owner are doing different jobs.
 *
 * Eight of these are shared screens that other verticals use too — work orders,
 * inspections, compliance, folios, invoices — filtered to rentals by a query
 * string. They are routed at `/property-management/*` inside the console so
 * clicking one does not throw the operator back out into the global admin.
 */
const PM_FINANCE_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];

export const PROPERTY_MGMT_NAV = [
  {
    key: 'home',
    label: 'Home',
    items: [
      { to: '/property-management', label: 'Dashboard', icon: LayoutGrid, end: true },
      { to: '/property-management/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    items: [
      { to: '/property-management/inbox', label: 'Inbox', icon: Inbox },
    ],
  },
  {
    key: 'rentals',
    label: 'Rentals',
    items: [
      { to: '/property-management/rentals', label: 'Properties', icon: Home },
      { to: '/property-management/enquiries', label: 'Rental Enquiries', icon: MessageSquareQuote },
      { to: '/property-management/applications', label: 'Tenant Applications', icon: ClipboardList },
      { to: '/property-management/assessments', label: 'Rental Assessments', icon: ClipboardCheck },
      { to: '/property-management/vacancies', label: 'Vacancy Notices', icon: DoorOpen },
      { to: '/property-management/renewals', label: 'Renewals', icon: CalendarRange },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { to: '/property-management/work-orders?vertical=rental', label: 'Maintenance / Work Orders', icon: Wrench },
      { to: '/property-management/inspections?type=rental', label: 'Rental Inspections', icon: ClipboardCheck },
      { to: '/property-management/compliance?listing_type=rent', label: 'Compliances', icon: ShieldCheck },
      { to: '/property-management/workflows?vertical_key=leasing,short_stay', label: 'Workflows', icon: Folder },
      { to: '/property-management/tenant-requests', label: 'Tenant Requests', icon: MessageSquare },
      { to: '/property-management/utilities', label: 'Utilities & Bills', icon: Sparkles },
    ],
  },
  {
    key: 'income',
    label: 'Money In',
    items: [
      { to: '/property-management/invoices?kind=client', label: 'Tenant Invoices', icon: Receipt, roles: PM_FINANCE_ROLES },
      { to: '/property-management/collect-rent', label: 'Collect Rent (Bulk)', icon: Banknote, roles: PM_FINANCE_ROLES },
      { to: '/property-management/rent-reminders', label: 'Rent Reminders (Bulk)', icon: AlertCircle, roles: PM_FINANCE_ROLES },
      { to: '/property-management/receipts', label: 'Rental Receipts', icon: Banknote, roles: PM_FINANCE_ROLES },
      { to: '/property-management/folios', label: 'Folios', icon: BookOpen, roles: PM_FINANCE_ROLES },
      { to: '/property-management/arrears', label: 'Arrears Actions', icon: AlertCircle, roles: PM_FINANCE_ROLES },
      { to: '/property-management/global-invoicing', label: 'Global Tenant Invoicing', icon: FileText, roles: PM_FINANCE_ROLES },
    ],
  },
  {
    key: 'payouts',
    label: 'Money Out',
    items: [
      { to: '/property-management/statements', label: 'Owner Statements', icon: Landmark, roles: PM_FINANCE_ROLES },
      { to: '/property-management/disbursements', label: 'Disbursement & Payouts', icon: HandCoins, roles: PM_FINANCE_ROLES },
      { to: '/property-management/disburse-owners', label: 'Pay Owners (Bulk)', icon: HandCoins, roles: PM_FINANCE_ROLES },
      { to: '/property-management/landlord-bills', label: 'Landlord Bills', icon: Receipt, roles: PM_FINANCE_ROLES },
      { to: '/property-management/settlements', label: 'Deposit Settlements', icon: Shield, roles: PM_FINANCE_ROLES },
      { to: '/property-management/expense-approvals', label: 'Expense Approvals', icon: ClipboardCheck, roles: PM_FINANCE_ROLES },
    ],
  },
  {
    key: 'agreements',
    label: 'Agreements',
    items: [
      /*
       * Both agreement builders this module owns. They were filed under the
       * global "Documents & Signing" section, away from the screens they are
       * about — a property manager drafting a tenancy agreement was leaving the
       * console to do it.
       *
       * PM = the owner/agency management agreement (SSPC-RPRMS-01).
       * TM = the tenancy agreement between landlord and tenant (SSPC-RPTMS-01).
       */
      { to: '/property-management/agreements', label: 'PM Agreements', icon: FileSignature },
      { to: '/property-management/tenancy-agreements', label: 'TM Agreements', icon: FileSignature },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      { to: '/property-management/marketing', label: 'Rental Marketing', icon: TrendingUp },
      { to: '/property-management/risks', label: 'Risk Register', icon: AlertCircle },
    ],
  },
];

export const propertyMgmtConsole = {
  slug: 'property-management',
  storageKey: 'pm.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Property Management',
    icon: KeyRound,
    // Violet over the same navy. Water Tank is cyan, Short Term Stay amber —
    // three consoles that read as one product, told apart at a glance.
    accent: '#8b5cf6',
    accentStrong: '#7c3aed',
    accentInk: '#6d28d9',
    accentTint: 'rgba(139,92,246,.12)',
    accentTint2: '#ede9fe',
  },
  navGroups: PROPERTY_MGMT_NAV,
  // No capabilities or work-queue endpoints yet; the nav gates on `roles:` and
  // shows no badges until those exist.
  api: {},
  // The screens are written in the pm-design system this console is named after.
  contentClass: 'pm-scope',
  exitTo: '/dashboard',
};

/* ── Residential Sales ─────────────────────────────────────────────────── */

/*
 * Six destinations across four groups.
 *
 * Smaller than the other three consoles, and honestly so: residential sales owns
 * five screens rather than twenty. What it lacks in breadth it has in depth —
 * `SalesPropertyFile` is the largest screen in the repository, and the listing
 * register is the way into it.
 *
 * NO AGREEMENTS GROUP YET. Buyer and seller agreements are being rewritten to
 * work the way the PM and TM builders do, and the documents are still to come.
 * A nav item pointing at a screen that does not exist is worse than no nav item,
 * so the group is left out rather than stubbed — the route-reachability
 * assertion would refuse it anyway.
 *
 * Compliance and Workflows are SHARED screens filtered by query string, routed
 * inside the console at `/residential/*` so clicking one does not eject the
 * operator back into the global admin.
 */
export const RESIDENTIAL_NAV = [
  {
    key: 'home',
    label: 'Home',
    items: [
      { to: '/residential/sell', label: 'Sell Dashboard', icon: LayoutGrid, end: true },
    ],
  },
  {
    key: 'selling',
    label: 'Selling',
    items: [
      { to: '/residential/properties/new?listing_type=sale&category=residential', label: 'New Listing', icon: Home },
    ],
  },
  {
    key: 'buying',
    label: 'Buying',
    items: [
      { to: '/residential/buy', label: 'Deals', icon: Briefcase },
      { to: '/residential/enquiry', label: 'Buyer Enquiries', icon: MessageSquareQuote },
    ],
  },
  {
    key: 'assurance',
    label: 'Assurance',
    items: [
      { to: '/residential/compliance?category=residential', label: 'Compliance', icon: ShieldCheck },
      { to: '/residential/workflows?vertical_key=properties', label: 'Checklists / Workflows', icon: Folder },
    ],
  },
];

export const residentialConsole = {
  slug: 'residential',
  storageKey: 'res.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Residential Sales',
    icon: Home,
    // Emerald, the fourth accent over the same navy: cyan for Water Tank, amber
    // for Short Term Stay, violet for Property Management.
    accent: '#10b981',
    accentStrong: '#059669',
    accentInk: '#047857',
    accentTint: 'rgba(16,185,129,.12)',
    accentTint2: '#d1fae5',
  },
  navGroups: RESIDENTIAL_NAV,
  api: {},
  contentClass: 'pm-scope',
  exitTo: '/dashboard',
};

/* ── Air Conditioning ──────────────────────────────────────────────────────
 * Air Conditioning runs the exact same workflow as Water Tank, so its console is
 * derived from the Water Tank nav — the same groups and screens, rebased onto
 * /air-conditioning/* and given a violet accent. The shared screens are scoped to
 * Air Conditioning data by the X-Service-Line header (services/api.js), and the
 * backend by serviceScope(req). See SERVICE_MODULE_DUPLICATION.md. */
const rebaseNav = (groups, fromBase, toBase) => groups.map((g) => ({
  ...g,
  key: `ac-${g.key}`,
  items: g.items.map((it) => ({ ...it, to: it.to.replace(fromBase, toBase) })),
}));

export const AIR_CONDITIONING_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/air-conditioning');

export const airConditioningConsole = {
  slug: 'air-conditioning',
  storageKey: 'ac.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Air Conditioning Services',
    icon: Sparkles,
    accent: '#7c3aed',          // violet — tells the AC console apart from WT cyan
    accentStrong: '#6d28d9',
    accentInk: '#5b21b6',
    accentTint: 'rgba(124,58,237,.12)',
    accentTint2: '#ede9fe',
  },
  navGroups: AIR_CONDITIONING_NAV,
  // Shared Water Tank ops endpoints, scoped to Air Conditioning by the header.
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Land & Property Assessment (Doc Verification & Transfer #1) ─────────────
 * Survey & Valuation Services — the first sub-service of the Property Doc
 * Verification & Transfer Support parent. Runs the exact same workflow as Water
 * Tank, so its console is the Water Tank nav rebased onto /land-property-assessment/*
 * with an indigo accent. Shared screens are scoped to this service line by the
 * X-Service-Line header (services/api.js) and the backend by serviceScope(req).
 * The other three sub-services become sibling consoles here when their docs land. */
// Doc Verification & Transfer collects property documents from the client, so this
// console gets an extra "Doc Manager" destination under Sales & Intake. Water Tank
// and Air Conditioning do not (it lives only on this console's nav).
export const LAND_PROPERTY_ASSESSMENT_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/land-property-assessment')
  .map((g) => (g.key.endsWith('intake')
    ? { ...g, items: [...g.items, { to: '/land-property-assessment/doc-manager', label: 'Doc Manager', icon: FolderArchive }] }
    : g));

export const landPropertyAssessmentConsole = {
  slug: 'land-property-assessment',
  storageKey: 'lpa.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Land & Property Assessment',
    icon: Ruler,
    accent: '#4f46e5',          // indigo — tells this console apart from WT cyan / AC violet
    accentStrong: '#4338ca',
    accentInk: '#3730a3',
    accentTint: 'rgba(79,70,229,.12)',
    accentTint2: '#e0e7ff',
  },
  navGroups: LAND_PROPERTY_ASSESSMENT_NAV,
  // Shared Water Tank ops endpoints, scoped to this service line by the header.
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Loan & Financial Support (Doc Verification & Transfer #2) ───────────────
 * Second sub-service of the Property Doc Verification & Transfer Support parent.
 * Same shared workflow as Water Tank, rebased onto /loan-financial-support/* with
 * a teal accent. It collects the client's financial documents (Doc Manager) and
 * adds a Loan Application Tracker — both injected into this console's nav only. */
export const LOAN_FINANCIAL_SUPPORT_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/loan-financial-support')
  .map((g) => {
    if (g.key.endsWith('intake')) {
      return { ...g, items: [...g.items, { to: '/loan-financial-support/doc-manager', label: 'Doc Manager', icon: FolderArchive }] };
    }
    if (g.key.endsWith('delivery')) {
      return { ...g, items: [{ to: '/loan-financial-support/loan-applications', label: 'Loan Applications', icon: Landmark }, ...g.items] };
    }
    return g;
  });

export const loanFinancialSupportConsole = {
  slug: 'loan-financial-support',
  storageKey: 'lfs.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Loan & Financial Support',
    icon: Landmark,
    accent: '#0d9488',          // teal — tells this console apart from LPAS indigo
    accentStrong: '#0f766e',
    accentInk: '#115e59',
    accentTint: 'rgba(13,148,136,.12)',
    accentTint2: '#ccfbf1',
  },
  navGroups: LOAN_FINANCIAL_SUPPORT_NAV,
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Property Documentation & Verification (Doc Verification & Transfer #3) ──
 * Third sub-service of the parent. Same shared workflow, rebased onto
 * /property-documentation-verification/* with an orange accent. Collects the
 * client's property documents (Doc Manager) and adds a Verification Register
 * (government searches + findings/risk) — both injected into this console's nav. */
export const PROPERTY_DOC_VERIFICATION_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/property-documentation-verification')
  .map((g) => {
    if (g.key.endsWith('intake')) {
      return { ...g, items: [...g.items, { to: '/property-documentation-verification/doc-manager', label: 'Doc Manager', icon: FolderArchive }] };
    }
    if (g.key.endsWith('delivery')) {
      return { ...g, items: [{ to: '/property-documentation-verification/verifications', label: 'Verifications', icon: ShieldCheck }, ...g.items] };
    }
    return g;
  });

export const propertyDocVerificationConsole = {
  slug: 'property-documentation-verification',
  storageKey: 'pdv.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Property Documentation & Verification',
    icon: ShieldCheck,
    accent: '#ea580c',          // orange — tells this console apart from LFS teal / LPAS indigo
    accentStrong: '#c2410c',
    accentInk: '#9a3412',
    accentTint: 'rgba(234,88,12,.12)',
    accentTint2: '#ffedd5',
  },
  navGroups: PROPERTY_DOC_VERIFICATION_NAV,
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Property Will & Succession (Doc Verification & Transfer #4) ────────────
 * Fourth and final sub-service of the parent. Same shared workflow, rebased onto
 * /property-will-succession/* with a rose accent. Collects the client's will/estate
 * documents (Doc Manager) and adds a Beneficiary / Heirs Register — both injected
 * into this console's nav only. */
export const PROPERTY_WILL_SUCCESSION_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/property-will-succession')
  .map((g) => {
    if (g.key.endsWith('intake')) {
      return { ...g, items: [...g.items, { to: '/property-will-succession/doc-manager', label: 'Doc Manager', icon: FolderArchive }] };
    }
    if (g.key.endsWith('delivery')) {
      return { ...g, items: [{ to: '/property-will-succession/beneficiaries', label: 'Beneficiaries', icon: Users }, ...g.items] };
    }
    return g;
  });

export const propertyWillSuccessionConsole = {
  slug: 'property-will-succession',
  storageKey: 'pws.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Property Will & Succession',
    icon: Users,
    accent: '#db2777',          // rose — tells this console apart from PDV orange
    accentStrong: '#be185d',
    accentInk: '#9d174d',
    accentTint: 'rgba(219,39,119,.12)',
    accentTint2: '#fce7f3',
  },
  navGroups: PROPERTY_WILL_SUCCESSION_NAV,
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Removal & Relocation ───────────────────────────────────────────────────
 * Delivered by Seventh Sky's OWN team + vehicles, so the Providers/Compliance
 * group is replaced by "Team & Fleet", and an "Inventory" destination is added.
 * No provider master agreement. Rebased onto /removal-relocation/* with an
 * amber-brown accent. */
export const REMOVAL_RELOCATION_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/removal-relocation')
  .map((g) => {
    if (g.key.endsWith('intake')) {
      return { ...g, items: [...g.items, { to: '/removal-relocation/inventory', label: 'Inventory', icon: Boxes }] };
    }
    if (g.key.endsWith('providers')) {
      // internal delivery: swap provider onboarding/compliance for Team & Fleet
      return { ...g, label: 'Team & Fleet', items: [{ to: '/removal-relocation/team-fleet', label: 'Team & Fleet', icon: Truck }] };
    }
    return g;
  });

export const removalRelocationConsole = {
  slug: 'removal-relocation',
  storageKey: 'rrs.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Removal & Relocation',
    icon: Truck,
    accent: '#b45309',          // amber-brown — tells this console apart from the others
    accentStrong: '#92400e',
    accentInk: '#78350f',
    accentTint: 'rgba(180,83,9,.12)',
    accentTint2: '#fef3c7',
  },
  navGroups: REMOVAL_RELOCATION_NAV,
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

/* ── Property Care & Concierge ──────────────────────────────────────────────
 * Delivered by Seventh Sky's OWN team + vehicles (internal, like Removal), so the
 * Providers/Compliance group becomes "Team & Fleet" and there is no provider master
 * agreement. Adds three Property-Care registers — Property Assets, Concierge & Access
 * and Utilities — plus the shared AMC console for ongoing/recurring care plans.
 * Rebased onto /property-care-concierge/* with an emerald accent. */
export const PROPERTY_CARE_CONCIERGE_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/property-care-concierge')
  .map((g) => {
    if (g.key.endsWith('intake')) {
      return { ...g, items: [...g.items, { to: '/property-care-concierge/property-assets', label: 'Property Assets', icon: Wrench }] };
    }
    if (g.key.endsWith('delivery')) {
      return {
        ...g,
        items: [
          ...g.items,
          { to: '/property-care-concierge/concierge', label: 'Concierge & Access', icon: KeyRound },
          { to: '/property-care-concierge/utilities', label: 'Utilities', icon: Plug },
        ],
      };
    }
    if (g.key.endsWith('providers')) {
      // internal delivery: swap provider onboarding/compliance for Team & Fleet
      return { ...g, label: 'Team & Fleet', items: [{ to: '/property-care-concierge/team-fleet', label: 'Team & Fleet', icon: Truck }] };
    }
    return g;
  });

export const propertyCareConciergeConsole = {
  slug: 'property-care-concierge',
  storageKey: 'pcc.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Property Care & Concierge',
    icon: Home,
    accent: '#059669',          // emerald — tells this console apart from the others
    accentStrong: '#047857',
    accentInk: '#065f46',
    accentTint: 'rgba(5,150,105,.12)',
    accentTint2: '#d1fae5',
  },
  navGroups: PROPERTY_CARE_CONCIERGE_NAV,
  api: { capabilities: '/wt-ops/capabilities', workQueue: '/wt-ops/work-queue' },
  exitTo: '/dashboard',
};

export const CONSOLES = {
  'water-tank': waterTankConsole,
  'air-conditioning': airConditioningConsole,
  'land-property-assessment': landPropertyAssessmentConsole,
  'loan-financial-support': loanFinancialSupportConsole,
  'property-documentation-verification': propertyDocVerificationConsole,
  'property-will-succession': propertyWillSuccessionConsole,
  'removal-relocation': removalRelocationConsole,
  'property-care-concierge': propertyCareConciergeConsole,
  'short-stay': shortStayConsole,
  'property-management': propertyMgmtConsole,
  residential: residentialConsole,
};
