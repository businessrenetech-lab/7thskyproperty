import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './kit';
import { ChangePassword } from '../screens/PasswordScreens';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;

  /*
   * A temporary password that was emailed is a credential sitting in an inbox.
   * The gate lives here rather than on the login screen because it has to hold
   * for EVERY authenticated destination — a portal user who bookmarked a deep
   * link would otherwise walk straight past a check that only ran at sign-in.
   */
  if (user.must_change_password) return <ChangePassword forced />;

  return children;
}
