import React from 'react';

const clearSessionAndReload = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBranch');
  } catch {}
  window.location.replace('/admin/login');
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Admin portal crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a', color: '#e2e8f0', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 520, border: '1px solid rgba(148,163,184,.25)', borderRadius: 20, background: 'rgba(15,23,42,.9)', padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,.35)' }}>
          <p style={{ margin: '0 0 8px', color: '#38bdf8', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' }}>Admin recovery</p>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>Admin portal failed to load</h1>
          <p style={{ margin: '14px 0 0', color: '#94a3b8', lineHeight: 1.6 }}>
            A saved session or browser state caused the admin app to crash. Clear the admin session and return to login.
          </p>
          <button type="button" onClick={clearSessionAndReload} style={{ marginTop: 22, width: '100%', border: 0, borderRadius: 12, padding: '13px 16px', background: '#38bdf8', color: '#082f49', fontWeight: 800, cursor: 'pointer' }}>
            Clear session and return to login
          </button>
          <pre style={{ marginTop: 18, maxHeight: 120, overflow: 'auto', color: '#fca5a5', whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
