import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Note: role='owner' is a landlord in Seventh Sky — the URL uses /landlord for clarity.
export const PORTAL_PATHS = { buyer: '/buyer', tenant: '/tenant', supplier: '/supplier', owner: '/landlord', landlord: '/landlord' };
export const portalPath = (role) => PORTAL_PATHS[role] || null;

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="topbar" style={{ position: 'sticky', top: 0 }}>
        <div className="row">
          <div className="logo" style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>7S</div>
          <div><div style={{ fontWeight: 800 }}>Seventh Sky Property Care</div><div className="crumb" style={{ textTransform: 'capitalize' }}>{(user?.role || '').replace(/_/g, ' ')} portal</div></div>
        </div>
        <div className="topbar-spacer" />
        <div className="row">
          <div className="avatar" title={user?.email}>{initials}</div>
          <button className="btn btn-ghost btn-icon" title="Sign out" onClick={async () => { await logout(); nav('/login'); }}><LogOut size={17} /></button>
        </div>
      </header>
      <main className="content" style={{ maxWidth: 1100 }}><Outlet /></main>
    </div>
  );
}
