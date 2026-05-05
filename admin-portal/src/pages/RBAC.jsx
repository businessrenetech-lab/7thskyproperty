import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Plus, Trash2, ChevronDown, ChevronRight, Save, 
  Loader2, Eye, EyeOff, Lock, GraduationCap, Briefcase, DollarSign, Target, Globe, Key, X
} from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../context/PermissionContext';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

/* ─── CONSTANTS ───────────────────────────────────────────── */
const PORTALS = [
  { key: 'admin',        label: 'Admin Portal',       color: '#00D4FF', icon: <Shield size={20} /> },
  { key: 'student',      label: 'Student Portal',     color: '#00FF94', icon: <GraduationCap size={20} /> },
  { key: 'teacher',      label: 'Teacher Portal',     color: '#FFB347', icon: <Briefcase size={20} /> },
  { key: 'accounting',   label: 'Accounting Portal',  color: '#9B6DFF', icon: <DollarSign size={20} /> },
  { key: 'hrm',          label: 'HRM Portal',         color: '#FF4D6D', icon: <Users size={20} /> },
  { key: 'brandmanager', label: 'Brand Manager',      color: '#38E8FF', icon: <Target size={20} /> },
];

const FEATURES = {
  admin: [
    { key: 'cockpit',         label: 'Operations Cockpit' },
    { key: 'crm',             label: 'CRM Pipeline' },
    { key: 'students',        label: 'Student Directory' },
    { key: 'lms',             label: 'LMS & Batches' },
    { key: 'pos',             label: 'POS & Fee Collection' },
    { key: 'finance',         label: 'Accounts Overview' },
    { key: 'invoices',        label: 'Invoice Management' },
    { key: 'expenses',        label: 'Expense Manager' },
    { key: 'reconciliation',  label: 'Bank Reconciliation' },
    { key: 'budget',          label: 'Budget Tracker' },
    { key: 'ledger',          label: 'General Ledger' },
    { key: 'journal',         label: 'Journal Entry' },
    { key: 'cashflow',        label: 'Cash Flow Statement' },
    { key: 'reports',         label: 'Intelligence Hub / Reports' },
    { key: 'pte',             label: 'PTE Practice Engine' },
    { key: 'erp',             label: 'ERP / Room Scheduling' },
    { key: 'assets',          label: 'Asset Management' },
    { key: 'payroll',         label: 'Staff & Payroll' },
    { key: 'attendance',      label: 'Attendance Registry' },
    { key: 'branches',        label: 'Branch Network' },
    { key: 'automation',      label: 'Automation Engine' },
    { key: 'website',         label: 'Website Management' },
    { key: 'rbac',            label: 'Security / RBAC' },
  ],
  student: [
    { key: 'dashboard',  label: 'Student Dashboard' },
    { key: 'pte',        label: 'PTE Practice & Mocks' },
    { key: 'attendance', label: 'Attendance View' },
    { key: 'schedule',   label: 'Class Schedule' },
    { key: 'materials',  label: 'Course Materials' },
    { key: 'billing',    label: 'Billing & Invoices' },
  ],
  teacher: [
    { key: 'dashboard',  label: 'Teacher Dashboard' },
    { key: 'batches',    label: 'My Batches' },
    { key: 'materials',  label: 'Material Center' },
    { key: 'pte',        label: 'PTE Analytics' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'reports',    label: 'Performance Reports' },
  ],
  accounting: [
    { key: 'overview',       label: 'Accounts Overview' },
    { key: 'pos',            label: 'POS & Fees' },
    { key: 'reconciliation', label: 'Reconciliation' },
    { key: 'ledger',         label: 'General Ledger' },
    { key: 'invoices',       label: 'Invoice Management' },
    { key: 'journal',        label: 'Journal Entry' },
    { key: 'expenses',       label: 'Expense Manager' },
    { key: 'budget',         label: 'Budget Tracker' },
    { key: 'cashflow',       label: 'Cash Flow' },
    { key: 'reports',        label: 'Financial Reports' },
  ],
  hrm: [
    { key: 'dashboard',  label: 'HRM Dashboard' },
    { key: 'staff',      label: 'Staff Directory' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'payroll',    label: 'Payroll' },
    { key: 'leave',      label: 'Leave Management' },
    { key: 'recruit',    label: 'Recruitment' },
  ],
  brandmanager: [
    { key: 'dashboard',  label: 'Brand Dashboard' },
    { key: 'campaigns',  label: 'Campaign Manager' },
    { key: 'social',     label: 'Social Analytics' },
    { key: 'content',    label: 'Content Calendar' },
    { key: 'templates',  label: 'Brand Templates' },
    { key: 'leads',      label: 'Lead Pipeline View' },
  ],
};

const INITIAL_SYSTEM_ROLES = [
  { key: 'super_admin',  label: 'Super Admin',     badge: 'Full Access',     color: '#00D4FF', protected: true },
  { key: 'branch_admin', label: 'Branch Admin',    badge: 'Branch Level',    color: '#00FF94', protected: true },
  { key: 'accounting',   label: 'Accountant',      badge: 'Finance Only',    color: '#9B6DFF', protected: true },
  { key: 'teacher',      label: 'Teacher',         badge: 'Teaching',        color: '#FFB347', protected: true },
  { key: 'crm',          label: 'Counselor/CRM',   badge: 'CRM + Students',  color: '#38E8FF', protected: true },
  { key: 'hrm',          label: 'HR Manager',      badge: 'Staff Only',      color: '#FF4D6D', protected: true },
  { key: 'staff',        label: 'Support Staff',   badge: 'Basic Support',   color: '#00D4FF', protected: true },
  { key: 'unassigned',   label: 'Unassigned',      badge: 'No Access',       color: '#777777', protected: true }
];

/* ─── BASELINE PERMISSION GENERATOR ──────────────────────── */
const getBaselineConfig = (roleKey, portalKey, featuresList) => {
  const toast = useToast();
  let enabled = false;
  let features = {};

  featuresList.forEach(f => features[f.key] = false); // default false

  if (roleKey === 'super_admin' || roleKey === 'branch_admin') {
    enabled = true;
    featuresList.forEach(f => features[f.key] = true);
  } else if (roleKey === 'accounting') {
    if (['accounting', 'hrm', 'student'].includes(portalKey)) {
      enabled = true;
      featuresList.forEach(f => features[f.key] = true);
    } else if (portalKey === 'admin') {
      enabled = true;
      features.students = true;
      features.finance = true;
      features.pos = true;
      features.ledger = true;
    }
  } else if (roleKey === 'hrm') {
    if (portalKey === 'hrm') {
      enabled = true;
      featuresList.forEach(f => features[f.key] = true);
    } else if (portalKey === 'admin') {
      enabled = true;
      features.rbac = true; 
      features.payroll = true;
      features.attendance = true;
    }
  } else if (roleKey === 'teacher') {
    if (['teacher', 'student'].includes(portalKey)) {
      enabled = true;
      featuresList.forEach(f => features[f.key] = true);
    }
  } else if (roleKey === 'crm') {
    if (portalKey === 'admin') {
      enabled = true;
      features.crm = true;
      features.students = true;
      features.attendance = true;
    }
  } else if (roleKey === 'brandmanager' && portalKey === 'brandmanager') {
     enabled = true;
     featuresList.forEach(f => features[f.key] = true);
  }

  return { enabled, features };
};

/* ─── COMPONENT: Toggle ──────────────────────────────────── */
const Toggle = ({ active, onChange, disabled }) => (
  <div
    onClick={() => !disabled && onChange(!active)}
    style={{
      width: 38, height: 21, borderRadius: 11, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
      background: active ? 'linear-gradient(90deg, #00D4FF, #9B6DFF)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
      boxShadow: active ? '0 0 10px rgba(0,212,255,0.3)' : 'none',
      transition: 'all 0.2s', flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}
  >
    <div style={{
      position: 'absolute', top: 2, left: active ? 19 : 2,
      width: 15, height: 15, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s cubic-bezier(0.22,1,0.36,1)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    }} />
  </div>
);

/* ─── MAIN RBAC PAGE ──────────────────────────────────────── */
const RBAC = () => {
  const [activeTab, setActiveTab] = useState('portals');
  const [expandedPortal, setExpandedPortal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const { savePermissions, loadPermissions } = usePermissions();

  // Dynamic roles state
  const [systemRoles, setSystemRoles] = useState(INITIAL_SYSTEM_ROLES);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [passModalUser, setPassModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Permission matrix — starts null, loaded from backend
  const [permissions, setPermissions] = useState(null);

  // Generate default baseline permissions
  const generateDefaults = () => {
    const defaults = {};
    INITIAL_SYSTEM_ROLES.forEach(role => {
      defaults[role.key] = {};
      PORTALS.forEach(portal => {
        defaults[role.key][portal.key] = getBaselineConfig(role.key, portal.key, FEATURES[portal.key] || []);
      });
    });
    return defaults;
  };

  // Load RBAC config from backend on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.get('/rbac/config');
        if (res.data.permissions) {
          setPermissions(res.data.permissions);
          if (res.data.customRoles && res.data.customRoles.length > 0) {
            setSystemRoles([...INITIAL_SYSTEM_ROLES, ...res.data.customRoles]);
          }
        } else {
          // No config saved yet — use baseline defaults
          setPermissions(generateDefaults());
        }
      } catch (err) {
        console.warn('Failed to load RBAC config, using defaults:', err);
        setPermissions(generateDefaults());
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/auth/staff');
      setStaff(res.data || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch('/auth/role', { userId, role: newRole });
      setStaff(staff.map(s => s.id === userId ? { ...s, role: newRole } : s));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleCreateCustomRole = () => {
    if (!newRoleName.trim()) return;
    const roleKey = newRoleName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Ensure uniqueness
    if (systemRoles.find(r => r.key === roleKey)) {
      toast.warning('A role with this name already exists.');
      return;
    }

    const newRole = {
      key: roleKey, label: newRoleName.trim(), badge: 'Custom Role', color: '#ffeb3b', protected: false
    };

    const updatedRoles = [...systemRoles, newRole];
    setSystemRoles(updatedRoles);

    // Initialize blank matrix for new role
    setPermissions(prev => {
      const next = { ...prev, [roleKey]: {} };
      PORTALS.forEach(portal => {
         next[roleKey][portal.key] = getBaselineConfig('unassigned', portal.key, FEATURES[portal.key] || []);
      });
      return next;
    });

    setNewRoleName('');
    setShowRoleModal(false);
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 6) { toast.warning('Password must be 6+ characters'); return; };
    try {
      await api.patch('/auth/staff-password', { userId: passModalUser.id, newPassword });
      toast.success('Password created successfully.');
      setPassModalUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    }
  };

  const togglePortalAccess = (role, portal) => {
    setPermissions(prev => {
      const next = { ...prev };
      
      // Safety initialize missing structure
      if (!next[role]) next[role] = {};
      if (!next[role][portal]) next[role][portal] = { enabled: false, features: {} };

      const prevEnabled = next[role][portal].enabled;
      
      next[role] = { ...next[role] };
      next[role][portal] = { ...next[role][portal], enabled: !prevEnabled };
      
      // If disabling, turn off all features. If enabling, turn on all features (optional logic)
      if (!next[role][portal].features) next[role][portal].features = {};
      next[role][portal].features = { ...next[role][portal].features };
      
      (FEATURES[portal] || []).forEach(f => {
        next[role][portal].features[f.key] = !prevEnabled;
      });
      return next;
    });
  };

  const toggleFeature = (role, portal, feature) => {
    setPermissions(prev => {
      const next = { ...prev };
      
      // Safety initialize
      if (!next[role]) next[role] = {};
      if (!next[role][portal]) next[role][portal] = { enabled: false, features: {} };
      if (!next[role][portal].features) next[role][portal].features = {};

      next[role] = { ...next[role] };
      next[role][portal] = { ...next[role][portal] };
      next[role][portal].features = { ...next[role][portal].features };
      next[role][portal].features[feature] = !next[role][portal].features[feature];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const customRoles = systemRoles.filter(r => !r.protected);
      await savePermissions(permissions, customRoles);
      // Also refresh the permission context so sidebar updates immediately
      await loadPermissions();
      toast.success('RBAC configuration saved to database successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save RBAC configuration');
    } finally {
      setSaving(false);
    }
  };

  const countEnabledFeatures = (role, portal) => {
    const p = permissions[role]?.[portal];
    if (!p) return { enabled: 0, total: 0 };
    const features = FEATURES[portal] || [];
    const enabled = features.filter(f => p.features?.[f.key]).length;
    return { enabled, total: features.length };
  };

  /* ─── TAB: Portal Access Matrix ──────────────────────────── */
  const renderPortalMatrix = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="glass-morphism" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
           <h3 style={{ fontSize: '1rem', margin: 0 }}>Portal Access Controls</h3>
           <button onClick={() => setShowRoleModal(true)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.4rem' }}>
             <Plus size={14}/> Add Custom Role
           </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `200px repeat(${PORTALS.length}, 1fr)`,
          gap: '0.5rem', minWidth: '900px'
        }}>
          {/* Header row */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0.8rem', fontWeight: '600' }}>
            ROLE \ PORTAL
          </div>
          {PORTALS.map(portal => (
            <div key={portal.key} style={{
              textAlign: 'center', padding: '0.8rem 0.4rem', fontSize: '0.75rem', fontWeight: '600',
              color: portal.color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}>
              <span>{portal.icon}</span>
              {portal.label}
            </div>
          ))}

          {/* Role rows */}
          {systemRoles.filter(r => r.key !== 'unassigned').map(role => (
            <React.Fragment key={role.key}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: role.color,
                  boxShadow: `0 0 8px ${role.color}50`, flexShrink: 0
                }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {role.label}
                      {!role.protected && <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'var(--glass)', borderRadius: '4px' }}>CUSTOM</span>}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{role.badge}</div>
                </div>
              </div>
              {PORTALS.map(portal => {
                const { enabled, total } = countEnabledFeatures(role.key, portal.key);
                const portalEnabled = permissions[role.key]?.[portal.key]?.enabled;
                return (
                  <div key={portal.key} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', padding: '0.6rem', borderTop: '1px solid var(--border)'
                  }}>
                    <Toggle
                      active={portalEnabled}
                      onChange={() => togglePortalAccess(role.key, portal.key)}
                      disabled={role.key === 'super_admin'}
                    />
                    {portalEnabled && (
                      <span style={{
                        fontSize: '0.6rem', color: 'var(--text-dim)',
                        background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '4px'
                      }}>
                        {enabled}/{total}
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  /* ─── TAB: Detailed Feature Permissions ─────────────────── */
  const renderDetailedPermissions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {PORTALS.map(portal => {
        const isExpanded = expandedPortal === portal.key;
        const features = FEATURES[portal.key] || [];
        return (
          <div key={portal.key} className="glass-morphism" style={{
            overflow: 'hidden',
            border: isExpanded ? `1px solid ${portal.color}30` : '1px solid var(--border)',
            transition: 'all 0.2s'
          }}>
            {/* Portal header */}
            <div
              onClick={() => setExpandedPortal(isExpanded ? null : portal.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.5rem', cursor: 'pointer',
                background: isExpanded ? `${portal.color}08` : 'transparent',
                borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ color: portal.color }}>{portal.icon}</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: portal.color }}>{portal.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {features.length} features · /{portal.key}
                  </div>
                </div>
              </div>
              {isExpanded ? <ChevronDown size={18} color="var(--text-dim)" /> : <ChevronRight size={18} color="var(--text-dim)" />}
            </div>

            {/* Expanded feature matrix */}
            {isExpanded && (
              <div style={{ padding: '1rem 1.5rem', overflowX: 'auto' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `200px repeat(${systemRoles.filter(r=>r.key!=='unassigned').length}, 1fr)`,
                  gap: '0.4rem', minWidth: '800px'
                }}>
                  {/* Header */}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0.6rem', fontWeight: '600' }}>
                    FEATURE
                  </div>
                  {systemRoles.filter(r=>r.key!=='unassigned').map(role => (
                    <div key={role.key} style={{
                      textAlign: 'center', padding: '0.5rem', fontSize: '0.65rem', fontWeight: '600', color: role.color
                    }}>
                      {role.label}
                    </div>
                  ))}

                  {/* Feature rows */}
                  {features.map(feature => (
                    <React.Fragment key={feature.key}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.6rem', borderTop: '1px solid var(--border)',
                        fontSize: '0.85rem', color: 'var(--text-main)'
                      }}>
                        {feature.label}
                      </div>
                      {systemRoles.filter(r=>r.key!=='unassigned').map(role => {
                        const portalEnabled = permissions[role.key]?.[portal.key]?.enabled;
                        const featureEnabled = permissions[role.key]?.[portal.key]?.features?.[feature.key];
                        return (
                          <div key={role.key} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderTop: '1px solid var(--border)', padding: '0.5rem'
                          }}>
                            {portalEnabled ? (
                              <Toggle
                                active={featureEnabled}
                                onChange={() => toggleFeature(role.key, portal.key, feature.key)}
                                disabled={role.key === 'super_admin'}
                              />
                            ) : (
                              <Lock size={14} color="var(--text-dim)" style={{ opacity: 0.3 }} />
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ─── TAB: Staff Assignment ─────────────────────────────── */
  const renderStaffAssignment = () => (
    <div className="glass-morphism" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>System Role Mapping & Secruity</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {staff.length} staff member{staff.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loadingStaff ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary)" />
        </div>
      ) : staff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
          No staff members found. Add staff from the Payroll module.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(200px, 1.2fr) minmax(180px, 1fr) minmax(120px, 0.8fr) minmax(100px, auto)',
            gap: '0.5rem', minWidth: '800px',
            padding: '0.8rem 0', borderBottom: '1px solid var(--border)',
            fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px'
          }}>
            <span>NAME</span>
            <span>EMAIL</span>
            <span>ASSIGN SYSTEM ROLE</span>
            <span>PORTALS</span>
            <span>SECURITY</span>
          </div>
          {staff.map((member, i) => {
            const role = systemRoles.find(r => r.key === member.role) || systemRoles.find(r => r.key === 'unassigned');
            const enabledPortals = PORTALS.filter(p => permissions[member.role]?.[p.key]?.enabled);
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(200px, 1.2fr) minmax(180px, 1fr) minmax(120px, 0.8fr) minmax(100px, auto)',
                gap: '0.5rem', padding: '1rem 0',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center', fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${role.color}, ${role.color}80)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: '700', color: '#fff', flexShrink: 0
                  }}>
                    {member.name?.[0] || '?'}
                  </div>
                  <span style={{ fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{member.name}</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{member.email}</span>
                
                {/* Editable Role Dropdown */}
                <select
                  className="glass-input"
                  value={role.key}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: role.key === 'unassigned' ? '#888' : role.color,
                    background: role.key === 'unassigned' ? 'rgba(255,255,255,0.05)' : `${role.color}15`,
                    border: `1px solid ${role.key === 'unassigned' ? 'var(--border)' : `${role.color}30`}`,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                >
                  {systemRoles.filter(r => r.key !== 'student').map(r => (
                    <option key={r.key} value={r.key} style={{ color: '#fff', background: '#121212' }}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {role.key === 'unassigned' ? 'No access' : `${enabledPortals.length} portal${enabledPortals.length !== 1 ? 's' : ''}`}
                </span>

                <button 
                  onClick={() => setPassModalUser(member)}
                  className="btn-primary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                >
                   <Key size={12}/> Set Pass
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ─── RENDER ─────────────────────────────────────────────── */
  if (loadingConfig || !permissions) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Loading RBAC Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Create Custom Role Modal */}
      {showRoleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-morphism" style={{ width: '400px', padding: '1.5rem', position: 'relative' }}>
             <h3 style={{ margin: '0 0 1rem 0' }}>Create Custom Role</h3>
             <div className="form-group">
                <label>Role Name (e.g., Marketing Temp)</label>
                <input 
                  className="glass-input" 
                  value={newRoleName} 
                  onChange={e => setNewRoleName(e.target.value)} 
                  autoFocus
                />
             </div>
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
               <button className="btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
               <button className="btn-primary" onClick={handleCreateCustomRole}>Create Role</button>
             </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {passModalUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-morphism" style={{ width: '400px', padding: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={18}/> Delegated Access</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => setPassModalUser(null)}>
                  <X size={18} />
                </button>
             </div>
             <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
               Securely update the password for <strong>{passModalUser.name}</strong>. They will use this new credential to authenticate via the central gateway.
             </p>
             <div className="form-group">
                <label>New Administrative Password</label>
                <input 
                  type="password"
                  className="glass-input" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  autoFocus
                />
             </div>
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
               <button className="btn-secondary" onClick={() => setPassModalUser(null)}>Cancel</button>
               <button className="btn-primary" onClick={handleSetPassword}>Save Credential</button>
             </div>
          </div>
        </div>
      )}


      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} />
            Security & Access Control
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Role-based portal access · Feature-level permissions · Staff mapping
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #00D4FF', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.1, color: '#00D4FF' }}><Shield size={40} /></div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Active Roles</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#00D4FF' }}>{systemRoles.filter(r => r.key !== 'unassigned').length}</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>system-wide</p>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #00FF94', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.1, color: '#00FF94' }}><Globe size={40} /></div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Portals</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#00FF94' }}>{PORTALS.length}</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>connected apps</p>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #FFB347', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.1, color: '#FFB347' }}><Lock size={40} /></div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Total Features</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#FFB347' }}>
            {Object.values(FEATURES).reduce((a, f) => a + f.length, 0)}
          </h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>managed permissions</p>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #9B6DFF', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.1, color: '#9B6DFF' }}><Users size={40} /></div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Staff Members</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#9B6DFF' }}>{staff.length}</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>system users</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '2px', padding: '4px', borderRadius: '11px', width: 'fit-content',
        background: 'var(--glass)', border: '1px solid var(--border)'
      }}>
        {[
          { key: 'portals', label: 'Portal Access Matrix' },
          { key: 'features', label: 'Feature Permissions' },
          { key: 'staff', label: 'Staff Assignment & Security' },
        ].map(tab => (
          <div key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1.2rem', borderRadius: '8px',
              fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--text-main)' : 'var(--text-dim)',
              background: activeTab === tab.key ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: activeTab === tab.key ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'portals' && renderPortalMatrix()}
      {activeTab === 'features' && renderDetailedPermissions()}
      {activeTab === 'staff' && renderStaffAssignment()}
    </div>
  );
};

export default RBAC;
