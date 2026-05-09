import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import '../styles/GlobalStyles.css';
import api from '../services/api';
import logo from '../assets/logo.png';

const LoginPage = () => {
  const [email, setEmail] = useState('admin@renetech.com');
  const [password, setPassword] = useState('Redowan173123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user } = response.data || {};
      if (!user?.role) {
        throw new Error('Invalid login response');
      }
      login(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach the server. Please check your connection or try again later.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'var(--bg-deep)',
      backgroundImage: 'radial-gradient(circle at top left, var(--accent-glow) 0%, transparent 40%), radial-gradient(circle at bottom right, var(--primary-glow) 0%, transparent 40%)',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'var(--font-ui)'
    }}>
      {/* Decorative Glow Elements */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '30vw', height: '30vw', background: 'var(--accent-glow)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: '25vw', height: '25vw', background: 'var(--primary-glow)', filter: 'blur(120px)', borderRadius: '50%' }}></div>

      <div 
        style={{ 
          padding: '3.5rem 3rem', 
          width: '100%', 
          maxWidth: '440px', 
          position: 'relative', 
          background: 'var(--bg-card)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          zIndex: 10
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <img 
            src={logo} 
            alt="Language Academy Logo" 
            style={{ 
              maxHeight: '70px', 
              width: 'auto', 
              display: 'block', 
              margin: '0 auto 1.5rem',
              filter: 'drop-shadow(0 4px 12px var(--primary-glow))' 
            }} 
          />
          <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', margin: 0 }}>Language Academy</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '2.5px', fontWeight: '600' }}>Executive Portal</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--danger)', 
            padding: '1rem', 
            borderRadius: '12px', 
            marginBottom: '2rem',
            fontSize: '0.85rem',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="email" 
                placeholder="name@languageacademy.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.95rem 1rem 0.95rem 2.8rem',
                  background: 'var(--glass)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--glass)'; }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', letterSpacing: '0.5px' }}>Password</label>
              <span 
                style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500', transition: 'filter 0.2s' }} 
                onMouseEnter={e => e.target.style.filter = 'brightness(1.2)'} 
                onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
              >
                Forgot?
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="password" 
                placeholder="••••••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.95rem 1rem 0.95rem 2.8rem',
                  background: 'var(--glass)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  letterSpacing: '2px'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--glass)'; }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ 
              background: loading ? 'var(--border)' : hovered ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              padding: '1rem', 
              fontSize: '1rem', 
              fontWeight: '600',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              marginTop: '1rem',
              width: '100%',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hovered && !loading ? '0 10px 25px -5px var(--primary-glow)' : '0 4px 14px 0 var(--primary-glow)',
              transform: hovered && !loading ? 'translateY(-1px)' : 'none'
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <>
                Sign In {hovered && <ArrowRight size={18} style={{ animation: 'slideRight 0.3s ease forwards' }} />}
              </>
            )}
            <style>{`
              @keyframes slideRight {
                from { transform: translateX(-5px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '500' }}>
          <p>Secure Enterprise Environment</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
