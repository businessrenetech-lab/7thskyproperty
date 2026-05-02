import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import '../styles/GlobalStyles.css';

const Layout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-container">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <Topbar 
        title={title} 
        onMenuClick={() => setSidebarOpen(prev => !prev)} 
      />
      <main className="canvas">
        {children}
      </main>

      {/* Bottom navigation — mobile only */}
      <BottomNav onMoreClick={() => setSidebarOpen(true)} />
    </div>
  );
};

export default Layout;
