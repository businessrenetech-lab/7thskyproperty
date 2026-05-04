import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      const selectedBranch = localStorage.getItem('selectedBranch');

      if (savedUser && token) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // If super_admin, respect selectedBranch (or 'all'/null). Otherwise use user.branch_id
        if (parsedUser.role === 'super_admin') {
          setBranch(selectedBranch === 'all' ? 'all' : (selectedBranch ? parseInt(selectedBranch) : null));
        } else {
          setBranch(parsedUser.branch_id);
        }
      }
    } catch (err) {
      console.warn('Clearing invalid admin session data:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedBranch');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setBranch(userData.branch_id);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setBranch(null);
  };

  const switchBranch = (branchId) => {
    if (user?.role === 'super_admin') {
      if (branchId === 'all') {
        localStorage.setItem('selectedBranch', 'all');
        setBranch('all');
      } else {
        localStorage.setItem('selectedBranch', branchId);
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
