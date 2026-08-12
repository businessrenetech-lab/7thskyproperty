import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/*
 * Password self-service.
 *
 * None of this existed anywhere in the app: a password could only be set FOR
 * someone by an administrator, so every forgotten password was a phone call.
 * That is untenable once providers and clients have logins — they cannot ring
 * the office to get back in — and staff get the same capability as a result.
 *
 * Three screens, one file, because they share the shell and the rules:
 *   ForgotPassword   ask for a link
 *   ResetPassword    use the link
 *   ChangePassword   from inside a session, including the forced first change
 */

const Shell = ({ title, subtitle, children }) => (
  <div style={{
    minHeight: '100vh', display: 'grid', placeItems: 'center',
    background: 'var(--bg, #f1f5f9)', padding: 20,
  }}>
    <div className="card" style={{ width: '100%', maxWidth: 420, padding: 30 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, marginBottom: 16,
        background: 'linear-gradient(135deg,var(--primary),var(--accent))',
        color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800,
      }}>7S</div>
      <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>{title}</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0, marginBottom: 20 }}>{subtitle}</p>
      {children}
    </div>
  </div>
);

const Err = ({ children }) => (children
  ? <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{children}</div>
  : null);

const Ok = ({ children }) => (children
  ? <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{children}</div>
  : null);

/** The one rule, stated once so both screens agree with the server. */
const tooShort = (p) => String(p || '').length < 8;

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');

  const go = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await api.post('/auth/forgot-password', { email });
      // The server answers the same whether or not the address exists — saying
      // otherwise would turn this into a way to discover who has an account.
      setDone(r.data.message);
    } catch (e2) { setErr(e2.response?.data?.error || 'Could not send the reset link.'); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Forgotten password" subtitle="We will email you a link to set a new one.">
      <Err>{err}</Err>
      <Ok>{done}</Ok>
      {!done && (
        <form onSubmit={go}>
          <label className="field">
            <span>Email address</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus />
          </label>
          <button className="btn primary" style={{ width: '100%', marginTop: 14 }} disabled={busy || !email}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
        <Link to="/login">Back to sign in</Link>
      </p>
    </Shell>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const go = async (e) => {
    e.preventDefault();
    if (tooShort(p1)) { setErr('Choose a password of at least 8 characters.'); return; }
    if (p1 !== p2) { setErr('The two passwords do not match.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.post('/auth/reset-password', { token, password: p1 });
      setDone(r.data.message);
      setTimeout(() => nav('/login'), 1800);
    } catch (e2) { setErr(e2.response?.data?.error || 'Could not reset the password.'); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Choose a new password" subtitle="This link works once and expires an hour after it was sent.">
      <Err>{err}</Err>
      <Ok>{done}</Ok>
      {!done && (
        <form onSubmit={go}>
          <label className="field">
            <span>New password</span>
            <input type="password" required value={p1} onChange={(e) => setP1(e.target.value)} autoFocus />
          </label>
          <label className="field" style={{ marginTop: 10 }}>
            <span>Confirm it</span>
            <input type="password" required value={p2} onChange={(e) => setP2(e.target.value)} />
          </label>
          <button className="btn primary" style={{ width: '100%', marginTop: 14 }} disabled={busy}>
            {busy ? 'Saving…' : 'Set password'}
          </button>
        </form>
      )}
    </Shell>
  );
}

/**
 * Change from inside a session.
 *
 * `forced` is the first sign-in case: someone is using a temporary password that
 * travelled through an email, and nothing else in the app should be reachable
 * until it has been replaced. There is deliberately no way past this screen
 * except changing the password or signing out.
 */
export function ChangePassword({ forced = false, onDone }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [cur, setCur] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async (e) => {
    e.preventDefault();
    if (tooShort(p1)) { setErr('Choose a password of at least 8 characters.'); return; }
    if (p1 !== p2) { setErr('The two passwords do not match.'); return; }
    setBusy(true); setErr('');
    try {
      await api.post('/auth/change-password', { current_password: cur, new_password: p1 });
      if (onDone) { onDone(); return; }
      // A full reload rather than a state nudge: the auth context caches the
      // user (including must_change_password) at bootstrap, and re-running that
      // is the one way to be certain the gate below sees the new value.
      window.location.assign('/admin');
    } catch (e2) { setErr(e2.response?.data?.error || 'Could not change the password.'); setBusy(false); }
  };

  return (
    <Shell
      title={forced ? 'Choose your own password' : 'Change your password'}
      subtitle={forced
        ? 'You are signed in with a temporary password that was emailed to you. Please replace it before continuing.'
        : 'Pick something you have not used here before.'}
    >
      <Err>{err}</Err>
      <form onSubmit={go}>
        <label className="field">
          <span>{forced ? 'Temporary password' : 'Current password'}</span>
          <input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoFocus />
        </label>
        <label className="field" style={{ marginTop: 10 }}>
          <span>New password</span>
          <input type="password" required value={p1} onChange={(e) => setP1(e.target.value)} />
        </label>
        <label className="field" style={{ marginTop: 10 }}>
          <span>Confirm it</span>
          <input type="password" required value={p2} onChange={(e) => setP2(e.target.value)} />
        </label>
        <button className="btn primary" style={{ width: '100%', marginTop: 14 }} disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
      {forced && (
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5 }}>
          <button className="btn" style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
            onClick={logout}>Sign out instead</button>
        </p>
      )}
    </Shell>
  );
}
