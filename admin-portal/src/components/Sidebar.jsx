import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, DollarSign, Settings, LogOut, Map as RoomMap,
  FileText, BarChart3, Calendar, Layers, GraduationCap, CreditCard, Package, Zap,
  ChevronRight, ChevronDown, Sun, Moon, Wallet, PieChart, TrendingUp, BookOpenCheck,
  Receipt, Shield, Scale, Globe, Lock, Clock, Briefcase, Award, Network, UserCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/GlobalStyles.css';

/* ─── MASTER ITEM LIST ─────────────────────────────────────────────────── *
 * Every possible sidebar item the admin portal can show.                  *
 * Items are grouped into visual sections.                                 *
 * The PermissionContext will filter these per the user's RBAC config.     *
 * ──────────────────────────────────────────────────────────────────────── */
const ALL_SECTIONS = [
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Cockpit',          icon: <LayoutDashboard size={18} />, id: 'dashboard' },
      { name: 'Intelligence Hub', icon: <BarChart3 size={18} />,       id: 'reports' },
      { name: 'CRM Pipeline',     icon: <Layers size={18} />,          id: 'crm' },
      { name: 'Students',         icon: <GraduationCap size={18} />,   id: 'students' },
      { name: 'LMS Batches',      icon: <BookOpen size={18} />,        id: 'lms' },
    ]
  },
  {
    label: 'FINANCE & ACCOUNTING',
    items: [
      { name: 'POS & Fees',       icon: <CreditCard size={18} />,    id: 'pos' },
      { name: 'Accounts Overview', icon: <DollarSign size={18} />,   id: 'finance' },
      { name: 'Bank & Cash',      icon: <Wallet size={18} />,        id: 'liquid-accounts' },
      { name: 'Invoices',         icon: <FileText size={18} />,      id: 'invoices' },
      { name: 'Expenses',         icon: <Wallet size={18} />,        id: 'expenses' },
      { name: 'Reconciliation',   icon: <Scale size={18} />,         id: 'reconciliation' },
      { name: 'General Ledger',   icon: <BookOpenCheck size={18} />, id: 'ledger' },
      { name: 'Journal Entry',    icon: <Receipt size={18} />,       id: 'journal' },
      { name: 'Cash Flow',        icon: <TrendingUp size={18} />,    id: 'cashflow' },
      { name: 'Financial Reports', icon: <BarChart3 size={18} />,    id: 'finance-reports' },
    ]
  },
  {
    label: 'MANAGEMENT',
    items: [
      { name: 'PTE Engine',       icon: <BarChart3 size={18} />,  id: 'pte' },
      { name: 'ERP Spaces',       icon: <RoomMap size={18} />,    id: 'erp' },
      { name: 'Asset Registry',   icon: <Package size={18} />,    id: 'assets' },
      { name: 'Branch Network',   icon: <Settings size={18} />,   id: 'branches' },
      { name: 'Material Center',  icon: <Layers size={18} />,     id: 'materials' },
      { name: 'Automation',       icon: <Zap size={18} />,        id: 'automation' },
      { name: 'Website Mgt.',     icon: <Globe size={18} />,      id: 'website-management' },
      { name: 'Security / RBAC',  icon: <Shield size={18} />,     id: 'rbac' },
    ]
  },
  {
    label: 'HUMAN RESOURCES',
    items: [
      { name: 'HR Dashboard',      icon: <UserCheck size={18} />,  id: 'hrm-dashboard' },
      { name: 'Staff Attendance',  icon: <Clock size={18} />,      id: 'staff-attendance' },
      { name: 'Staff & Payroll',   icon: <Users size={18} />,      id: 'payroll' },
      { name: 'Leave Manager',     icon: <Calendar size={18} />,   id: 'leave-management' },
      { name: 'Recruitment',       icon: <Briefcase size={18} />,  id: 'recruitment' },
      { name: 'Documents',         icon: <FileText size={18} />,   id: 'staff-documents' },
      { name: 'Performance',       icon: <Award size={18} />,      id: 'performance' },
      { name: 'Shift Planner',     icon: <Clock size={18} />,      id: 'shifts' },
      { name: 'Org Chart',         icon: <Network size={18} />,    id: 'org-chart' },
    ]
  }
];

const Sidebar = () => {
  const { user, branch, switchBranch, logout } = useAuth();
  const { filterItems, canAccess } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [branches, setBranches] = React.useState([]);
  const [collapsed, setCollapsed] = useState({});

  React.useEffect(() => {
    if (user?.role === 'super_admin') fetchBranches();
  }, [user]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) { console.error('Failed to fetch branches'); }
  };

  const toggleSection = (label) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const getItemPath = (itemId) => itemId === 'dashboard' ? '/' : `/${itemId}`;

  /* ─── Build filtered section list ──────────────────────────────── */
  const sectionList = ALL_SECTIONS
    .map(section => ({
      ...section,
      items: filterItems(section.items),
    }))
    .filter(section => section.items.length > 0); // Hide empty sections

  return (
    <aside className="sidebar glass-morphism" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Logo */}
      <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.9rem', color: '#fff', boxShadow: '0 4px 12px rgba(50, 97, 154, 0.4)' }}>LA</div>
          <div>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.5px', margin: 0, fontFamily: 'var(--font-heading)' }}>LANGUAGE ACADEMY</h2>
            <p style={{ fontSize: '10px', color: 'var(--accent)', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>Executive Cloud</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.6rem' }}>
        {sectionList.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            <Lock size={24} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <p>No modules assigned to your role.</p>
            <p style={{ fontSize: '0.7rem' }}>Contact your administrator for access.</p>
          </div>
        )}
        {sectionList.map((section, si) => (
          <div key={si} style={{ marginBottom: '0.3rem' }}>
            {/* Section Header */}
            <div onClick={() => toggleSection(section.label)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600', margin: 0 }}>{section.label}</p>
              {collapsed[section.label] ? <ChevronRight size={12} color="var(--text-dim)" /> : <ChevronDown size={12} color="var(--text-dim)" />}
            </div>

            {/* Section Items */}
            {!collapsed[section.label] && section.items.map((item) => {
              const itemPath = getItemPath(item.id);
              const isActive = item.id === 'dashboard'
                ? location.pathname === '/' || location.pathname === '/dashboard'
                : location.pathname === itemPath;
              return (
                <div key={item.id} onClick={() => navigate(itemPath)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                    color: isActive ? 'var(--primary)' : 'var(--text-dim)',
                    background: isActive ? 'var(--primary-glow)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '4px', fontSize: '0.85rem',
                    borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                    paddingLeft: isActive ? '0.6rem' : '0.8rem'
                  }}
                  onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--glass)'; } }}
                  onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'none'; } }}
                >
                  {item.icon}
                  <span style={{ fontWeight: '500' }}>{item.name}</span>
                  {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                </div>
              );
            })}
          </div>
        ))}
        {/* Super Admin Explicit Overrides */}
        {user?.role === 'super_admin' && (
          <div style={{ marginBottom: '0.3rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.8rem' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600', margin: 0 }}>SYSTEM</p>
            </div>
            <div onClick={() => navigate('/settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem',
                padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                color: location.pathname === '/settings' ? 'var(--primary)' : 'var(--text-dim)',
                background: location.pathname === '/settings' ? 'var(--primary-glow)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '4px', fontSize: '0.85rem',
                borderLeft: location.pathname === '/settings' ? '4px solid var(--primary)' : '4px solid transparent',
                paddingLeft: location.pathname === '/settings' ? '0.6rem' : '0.8rem'
              }}
              onMouseOver={(e) => { if (location.pathname !== '/settings') { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--glass)'; } }}
              onMouseOut={(e) => { if (location.pathname !== '/settings') { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'none'; } }}
            >
              <Settings size={18} />
              <span style={{ fontWeight: '500' }}>System Config</span>
              {location.pathname === '/settings' && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </div>
          </div>
        )}
      </nav>

      {/* Footer — fixed at bottom, not absolute */}
      <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '0.75rem' }}>
            {user?.name?.[0] || 'A'}
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', margin: 0 }}>{user?.name || 'Admin'}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: 0 }}>Branch: {branch || 'All'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </div>
          <LogOut size={16} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={logout} />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
