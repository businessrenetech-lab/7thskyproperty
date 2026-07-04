import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { portalPath } from '../ui/PortalLayout';
import { Spinner } from '../ui/kit';

export default function Login() {
  const [email, setEmail] = useState('admin@seventhskyproperty.com');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data?.token) { try { localStorage.setItem('token', data.token); } catch {} }
      if (!data?.user?.role) throw new Error('Invalid response');
      login(data.user);
      nav(portalPath(data.user.role) || '/dashboard', { replace: true });
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
        </form>
        <p style={{ textAlign: 'center', color: 'var(--muted-2)', fontSize: 12, marginTop: 18 }}>Secure enterprise environment</p>
      </div>
    </div>
  );
}
