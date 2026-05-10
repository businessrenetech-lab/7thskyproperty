import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const PermissionContext = createContext();

/* ─── RBAC feature key → sidebar route ID mapping ──────────────────────── */
const FEATURE_ROUTE_MAP = {
  cockpit:        'dashboard',
  crm:            'crm',
  students:       'students',
  lms:            'lms',
  pos:            'pos',
  finance:        'finance',
  invoices:       'invoices',
  expenses:       'expenses',
  reconciliation: 'reconciliation',
  budget:         'budget',
  ledger:         'ledger',
  journal:        'journal',
  cashflow:       'cashflow',
  reports:        'reports',
  pte:            'pte',
  erp:            'erp',
  assets:         'assets',
  payroll:        'payroll',
  attendance:     'attendance',
  branches:       'branches',
  automation:     'automation',
  website:        'website-management',
  rbac:           'rbac',
};

/* Extra routes that are sub-sections of a feature */
const FEATURE_EXTRA_ROUTES = {
  finance: ['liquid-accounts'],
  reports: ['finance-reports'],
  lms:     ['materials'],
  payroll: ['hrm-dashboard', 'staff-attendance', 'leave-management', 'recruitment', 'staff-documents', 'performance', 'shifts', 'org-chart'],
};

const ROLE_PERMISSION_FALLBACKS = {
  accounts: ['accounts', 'accounting'],
  trainer: ['trainer', 'teacher'],
  counselor: ['counselor', 'crm'],
  hr: ['hr', 'hrm'],
};

const getPermissionRoleKey = (role, permissions) => {
  if (!permissions) return role;
  const candidates = ROLE_PERMISSION_FALLBACKS[role] || [role];
  return candidates.find((candidate) => permissions[candidate]) || role;
};

const getFeatureKeyForRoute = (routeId) => {
  if (ROUTE_FEATURE_MAP[routeId]) return ROUTE_FEATURE_MAP[routeId];
  const parentRoute = String(routeId || '').split('/')[0];
  return ROUTE_FEATURE_MAP[parentRoute];
};

/* Reverse map: route → feature key */
const ROUTE_FEATURE_MAP = {};
Object.entries(FEATURE_ROUTE_MAP).forEach(([feat, route]) => {
  ROUTE_FEATURE_MAP[route] = feat;
});
Object.entries(FEATURE_EXTRA_ROUTES).forEach(([feat, routes]) => {
  routes.forEach(r => { ROUTE_FEATURE_MAP[r] = feat; });
});

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(null); // null = not loaded yet
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Load permissions from backend */
  const loadPermissions = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await api.get('/rbac/config');
      if (res.data.permissions) {
        setPermissions(res.data.permissions);
        setCustomRoles(res.data.customRoles || []);
      } else {
        setPermissions(null); // no config saved yet → will use defaults
      }
    } catch (err) {
      console.warn('Failed to load RBAC config:', err);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadPermissions(); }, [loadPermissions]);

  /* Save permissions to backend (called from RBAC admin page) */
  const savePermissions = useCallback(async (newPermissions, newCustomRoles) => {
    try {
      await api.put('/rbac/config', {
        permissions: newPermissions,
        customRoles: newCustomRoles || [],
      });
      setPermissions(newPermissions);
      setCustomRoles(newCustomRoles || []);
      return true;
    } catch (err) {
      console.error('Failed to save RBAC config:', err);
      throw err;
    }
  }, []);

  /**
   * Check if the current user's role has a specific admin feature enabled.
   * Returns true only when the role is explicitly allowed by the RBAC matrix.
   * Super admins retain full access, and dashboard is always available.
   */
  const canAccess = useCallback((routeId) => {
    if (!user) return false;
    const role = user.role;

    // Super admins always have full access
    if (role === 'super_admin') return true;

    // Dashboard is always accessible for any authenticated user
    if (routeId === 'dashboard') return true;

    // If RBAC config hasn't been saved yet, deny non-admin module access.
    if (!permissions) return false;

    const roleKey = getPermissionRoleKey(role, permissions);

    // Map the route to a feature key
    const featureKey = getFeatureKeyForRoute(routeId);
    if (!featureKey) return false;

    // Check the admin portal permission for this role
    const adminConfig = permissions[roleKey]?.admin;
    
    // If the role has no config entry at all in the matrix, deny access.
    if (!permissions[roleKey]) return false;
    
    if (!adminConfig) return false; // Role exists in matrix but admin portal disabled
    if (!adminConfig.enabled) return false; // Admin portal explicitly disabled

    return !!adminConfig.features?.[featureKey];
  }, [user, permissions]);

  /**
   * Filter a list of sidebar items, keeping only those the user's role can access.
   */
  const filterItems = useCallback((items) => {
    if (!user) return [];
    const role = user.role;
    if (role === 'super_admin') return items;

    return items.filter(item => canAccess(item.id));
  }, [user, permissions, canAccess]);

  /**
   * Get the full permission matrix for the RBAC admin page.
   */
  const getFullConfig = useCallback(() => ({
    permissions,
    customRoles,
  }), [permissions, customRoles]);

  return (
    <PermissionContext.Provider value={{
      permissions,
      customRoles,
      loading,
      canAccess,
      filterItems,
      savePermissions,
      loadPermissions,
      getFullConfig,
      FEATURE_ROUTE_MAP,
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);
