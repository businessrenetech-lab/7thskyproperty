import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const clearStoredSession = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBranch');
  } catch {
    // Storage may be unavailable in locked-down browsers. UI should still render.
  }
};

const writeStoredSession = (userData) => {
  try {
    localStorage.setItem('user', JSON.stringify(userData));
  } catch {
    // Keep in-memory auth working even if persistence fails.
  }
};

const getBranchForUser = (userData, selectedBranch) => {
  if (userData?.role === 'super_admin') {
    return selectedBranch && selectedBranch !== 'all' ? parseInt(selectedBranch) : 'all';
  }
  return userData?.branch_id || null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState(null);

  useEffect(() => {
    let active = true;

    const initializeSession = async () => {
      let cachedUser = null;
      let selectedBranch = null;

      try {
        const savedUser = localStorage.getItem('user');
        selectedBranch = localStorage.getItem('selectedBranch');

        if (savedUser) {
          cachedUser = JSON.parse(savedUser);
          if (active) {
            setUser(cachedUser);
            setBranch(getBranchForUser(cachedUser, selectedBranch));
          }
        }
      } catch (err) {
        console.warn('Clearing invalid admin session data:', err);
        clearStoredSession();
      }

      try {
        const response = await api.get('/auth/me');
        const freshUser = response.data?.user;
        if (!freshUser?.role) throw new Error('Invalid session response');

        writeStoredSession(freshUser);
        if (active) {
          setUser(freshUser);
          setBranch(getBranchForUser(freshUser, selectedBranch));
        }
      } catch (err) {
        if ([401, 403].includes(err.response?.status)) {
          clearStoredSession();
          if (active) {
            setUser(null);
            setBranch(null);
          }
        } else if (!cachedUser) {
          if (active) {
            setUser(null);
            setBranch(null);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeSession();

    return () => {
      active = false;
    };
  }, []);

  const login = (userData) => {
    clearStoredSession();
    writeStoredSession(userData);
    setUser(userData);
    setBranch(getBranchForUser(userData, null));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout must still work if the network is unavailable.
    } finally {
      clearStoredSession();
      setUser(null);
      setBranch(null);
    }
  };

  const switchBranch = (branchId) => {
    if (user?.role === 'super_admin') {
      if (branchId === 'all') {
        try { localStorage.setItem('selectedBranch', 'all'); } catch {}
        setBranch('all');
      } else {
        try { localStorage.setItem('selectedBranch', branchId); } catch {}
        setBranch(branchId);
      }
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ user, branch, loading, login, logout, switchBranch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
