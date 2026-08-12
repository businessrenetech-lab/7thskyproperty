import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { portalPath } from '../ui/PortalLayout';
import { Spinner } from '../ui/kit';

// Public Google OAuth client ID (safe to embed; override at build via env).
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '82959977221-3k1ag8ofcgrp9kuvtbj9ld4dvhhmpobm.apps.googleusercontent.com';

// Load the Google Identity Services script once.
let gisPromise = null;
function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

export default function Login() {
  const [email, setEmail] = useState('admin@seventhskyproperty.com');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const googleBtnRef = useRef(null);

  const finishLogin = useCallback((data) => {
    if (data?.token) { try { localStorage.setItem('token', data.token); } catch {} }
    if (!data?.user?.role) throw new Error('Invalid response');
    login(data.user);
    nav(portalPath(data.user.role) || '/dashboard', { replace: true });
  }, [login, nav]);

  const onGoogleCredential = useCallback(async (response) => {
    setLoading(true); setErr('');
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      finishLogin(data);
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Google sign-in failed.');
    } finally { setLoading(false); }
  }, [finishLogin]);

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then((google) => {
        if (cancelled || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onGoogleCredential,
        });
        if (googleBtnRef.current) {
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 372,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'center',
          });
        }
      })
      .catch(() => { /* button just won't render; email/password still works */ });
    return () => { cancelled = true; };
  }, [onGoogleCredential]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      finishLogin(data);
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#eef4ff,#f4f7fb)' }}>
      <div style={{ width: 420, maxWidth: '92vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px', background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20 }}>7S</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Seventh Sky Property Care</h1>
          <p style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 6 }}>Admin CRM Portal</p>
        </div>
        <form onSubmit={submit} className="card card-pad" style={{ boxShadow: 'var(--shadow-lg)' }}>
          {err && <div style={{ background: 'var(--danger-bg)', color: '#b91c1c', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{err}</div>}
          <div className="field">
            <label>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: 36 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: 36 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={loading}>
            {loading ? <Spinner /> : <>Sign In <ArrowRight size={16} /></>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line, #e5e7eb)' }} />
            <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line, #e5e7eb)' }} />
          </div>
          <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
        </form>
        {/* Providers and clients sign in here too, and they cannot ring the
            office when they forget — this is the only way back in for them. */}
        <p style={{ textAlign: 'center', fontSize: 13, marginTop: 16 }}>
          <Link to="/forgot-password">Forgotten your password?</Link>
        </p>
        <p style={{ textAlign: 'center', color: 'var(--muted-2)', fontSize: 12, marginTop: 14 }}>Secure enterprise environment</p>
      </div>
    </div>
  );
}
