/**
 * Route Prefetch Map — maps sidebar route IDs to their dynamic import functions.
 * When a user hovers over a sidebar item, we trigger the import() to preload
 * the chunk so navigation feels instant.
 */

const routeImportMap = {
  'dashboard':          () => import('../pages/Cockpit'),
  'reports':            () => import('../pages/Reports'),
  'crm':                () => import('../pages/CRM'),
  'students':           () => import('../pages/Students'),
  'lms':                () => import('../pages/LMS'),
  'pos':                () => import('../pages/AdminPOSFees'),
  'finance':            () => import('../pages/Finance'),
  'liquid-accounts':    () => import('../pages/AdminLiquidAccounts'),
  'invoices':           () => import('../pages/AdminInvoices'),
  'expenses':           () => import('../pages/AdminExpenses'),
  'reconciliation':     () => import('../pages/Reconciliation'),
  'ledger':             () => import('../pages/AdminLedger'),
  'journal':            () => import('../pages/AdminJournal'),
  'cashflow':           () => import('../pages/AdminCashFlow'),
  'finance-reports':    () => import('../pages/AdminReportsHub'),
  'erp':                () => import('../pages/ERP'),
  'assets':             () => import('../pages/Assets'),
  'branches':           () => import('../pages/BranchManagement'),
  'automation':         () => import('../pages/Automation'),
  'website-management': () => import('../pages/WebsiteManagement'),
  'rbac':               () => import('../pages/RBAC'),
  'hrm-dashboard':      () => import('../pages/HRMDashboard'),
  'staff-attendance':   () => import('../pages/StaffAttendance'),
  'payroll':            () => import('../pages/Payroll'),
  'leave-management':   () => import('../pages/LeaveManagement'),
  'recruitment':        () => import('../pages/Recruitment'),
  'staff-documents':    () => import('../pages/StaffDocuments'),
  'performance':        () => import('../pages/PerformanceReviews'),
  'shifts':             () => import('../pages/ShiftPlanner'),
  'org-chart':          () => import('../pages/OrgChart'),
  'settings':           () => import('../pages/Settings'),
  'pte':                () => import('../pages/PTE'),
  'materials':          () => import('../pages/MaterialCenter'),
  'attendance':         () => import('../pages/Attendance'),
};

// Track already-prefetched routes to avoid redundant imports
const prefetched = new Set();

/**
 * Prefetch a route chunk by its sidebar ID.
 * Call this on mouseenter/pointerenter for zero-latency navigation.
 */
export const prefetchRoute = (routeId) => {
  if (!routeId || prefetched.has(routeId)) return;
  
  const loader = routeImportMap[routeId];
  if (loader) {
    prefetched.add(routeId);
    // Use requestIdleCallback if available, otherwise setTimeout
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
    schedule(() => {
      loader().catch(() => {
        // Import failed (e.g. offline) — remove from prefetched so retry is possible
        prefetched.delete(routeId);
      });
    });
  }
};

/**
 * Prefetch all routes that are visible in the sidebar.
 * Called once after initial render to preload everything in idle time.
 */
export const prefetchVisibleRoutes = (visibleRouteIds) => {
  if (!visibleRouteIds || visibleRouteIds.length === 0) return;
  
  // Stagger prefetching to avoid blocking main thread
  let delay = 1000; // Start after 1s of idle
  visibleRouteIds.forEach((id) => {
    if (!prefetched.has(id)) {
      setTimeout(() => prefetchRoute(id), delay);
      delay += 200; // 200ms gap between each
    }
  });
};

export default prefetchRoute;
