import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserCheck, GraduationCap, MoreHorizontal, Clock, CheckCircle2, Loader2, Landmark, Banknote, ArrowLeftRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/GlobalStyles.css';

const BottomNav = ({ onMoreClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setCheckInResult(null);
    try {
      // Get current location for attendance
      let lat = null, lng = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        // Location not available, proceed without
      }

      const res = await api.post('/hrm/attendance/self-checkin', {
        latitude: lat,
        longitude: lng,
      });
      setCheckInResult(res.data?.type === 'checkout' ? 'checkout' : 'success');
      setTimeout(() => setCheckInResult(null), 3000);
    } catch (err) {
      console.error('Check-in failed', err);
      setCheckInResult(err.response?.data?.error || 'error');
      setTimeout(() => setCheckInResult(null), 4000);
    } finally {
      setCheckingIn(false);
    }
  };

  const isReconciliation = location.pathname === '/reconciliation';

  const defaultTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'attendance', label: 'Attendance', icon: Clock, path: '/staff-attendance' },
    { id: 'checkin', label: 'Clock In', icon: UserCheck, path: null, isAction: true },
    { id: 'students', label: 'Students', icon: GraduationCap, path: '/students' },
    { id: 'more', label: 'More', icon: MoreHorizontal, path: null, isMore: true },
  ];

  const reconTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'recon-opening', label: 'Opening', icon: Landmark, modalAction: 'opening' },
    { id: 'recon-collection', label: 'Collection', icon: Banknote, modalAction: 'collection' },
    { id: 'recon-transfer', label: 'Transfer', icon: ArrowLeftRight, modalAction: 'transfer' },
    { id: 'recon-closing', label: 'Closing', icon: ShieldCheck, modalAction: 'closing' },
  ];

  const tabs = isReconciliation ? reconTabs : defaultTabs;

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const openReconModal = (modalName) => {
    window.dispatchEvent(new CustomEvent('recon-open-modal', { detail: modalName }));
  };

  return (
    <>
      {/* Check-in success/error toast */}
      {checkInResult && (
        <div className="checkin-toast" style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3001,
          padding: '10px 20px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeInUp 0.3s ease',
          ...(checkInResult === 'success' || checkInResult === 'checkout'
            ? { background: 'rgba(0,255,148,0.15)', color: '#4DFFA8', border: '1px solid rgba(0,255,148,0.3)' }
            : { background: 'rgba(255,77,109,0.15)', color: '#FF7088', border: '1px solid rgba(255,77,109,0.3)' }
          )
        }}>
          {(checkInResult === 'success' || checkInResult === 'checkout') ? <CheckCircle2 size={16} /> : null}
          {checkInResult === 'success' ? '✅ Checked in successfully!' 
            : checkInResult === 'checkout' ? '✅ Checked out successfully!' 
            : typeof checkInResult === 'string' && checkInResult !== 'error' ? checkInResult 
            : 'Check-in failed. Try again.'}
        </div>
      )}

      <nav className="bottom-nav" aria-label="Primary mobile navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          // Reconciliation quick action buttons
          if (tab.modalAction) {
            return (
              <button
                key={tab.id}
                className="bottom-nav-item recon-action"
                onClick={() => openReconModal(tab.modalAction)}
                aria-label={tab.label}
                type="button"
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          }

          // Check-In action button (center, prominent)
          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                className="bottom-nav-checkin"
                onClick={handleCheckIn}
                disabled={checkingIn}
                aria-label="Clock in"
                type="button"
              >
                <div className="bottom-nav-checkin-circle">
                  {checkingIn 
                    ? <Loader2 size={24} className="animate-spin" /> 
                    : <UserCheck size={24} />
                  }
                </div>
                <span>{checkingIn ? 'Checking...' : 'Clock In'}</span>
              </button>
            );
          }

          // "More" opens sidebar
          if (tab.isMore) {
            return (
              <button
                key={tab.id}
                className="bottom-nav-item"
                onClick={onMoreClick}
                aria-label="Open more modules"
                type="button"
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              type="button"
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default BottomNav;
