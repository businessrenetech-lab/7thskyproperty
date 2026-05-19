import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { Shield } from 'lucide-react';
import PageLoader from './PageLoader';

const ProtectedRoute = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { canAccess, loading: permLoading } = usePermissions();
  const location = useLocation();

  if (authLoading || permLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Extract the current route ID from the pathname
  const pathSegment = location.pathname.replace(/^\/+/, '') || 'dashboard';

  // Check RBAC permissions for this route
  if (!canAccess(pathSegment)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '70vh', textAlign: 'center', gap: '1rem', color: 'var(--text-dim)'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,77,109,0.1)', border: '2px solid rgba(255,77,109,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={28} color="#FF4D6D" />
        </div>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.3rem', margin: 0 }}>Access Restricted</h2>
        <p style={{ fontSize: '0.85rem', maxWidth: 400, lineHeight: 1.6 }}>
          Your role does not have permission to access this module.
          Contact your administrator to request access via the RBAC settings.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: '0.5rem', padding: '0.5rem 1.5rem', borderRadius: '8px',
            background: 'var(--glass)', border: '1px solid var(--border)',
            color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
