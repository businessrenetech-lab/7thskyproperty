import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CloudLightning, RefreshCw, LogOut, Phone, Mail, MapPin } from 'lucide-react';
import api from '../../services/api';
import { Loading, EmptyState, toast, errText, ToastHost } from './common';
import PortalClient from './PortalClient';
import PortalProvider from './PortalProvider';
import '../../styles/wt-scope.css';

/*
 * Portal — one shell, two audiences.
 *
 * External parties previously did none of their own steps: a provider accepted a
 * job by telephoning the office, who clicked Accept for them; a client asked for
 * their invoice and someone emailed a PDF. Both are staff impersonating someone
 * else, and for anything meant to be the other party's decision it was not
 * really their decision.
 *
 * The token in the URL is the credential — there is no login on that path. The
 * server decides which portal this is and returns only that party's whitelisted
 * data, so this screen never has to know what it is allowed to show; it renders
 * what it is given. That is deliberate: a filter implemented on the client is
 * not a filter.
 *
 * The shell is thin on purpose. Everything specific to an audience lives in
 * PortalClient or PortalProvider, and everything shared lives in portalBits, so
 * the two never drift into looking like two different companies.
 */

function Shell({ title, subtitle, children, onRefresh, right }) {
  return (
    <div className="wt-scope">
      <div style={{ minHeight: '100vh', background: 'var(--wt-bg, #f8fafc)' }}>
        <header style={{
          background: 'var(--wt-sidebar)', color: '#fff', padding: '16px 22px',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <span className="wt-brand-mark"><CloudLightning size={20} /></span>
          <div style={{ flex: '1 0 200px', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Seventh Sky — {title}</div>
            <div style={{ fontSize: 11.5, opacity: 0.78 }}>{subtitle}</div>
          </div>
          {right}
          {onRefresh && (
            <button className="wt-btn sm" onClick={onRefresh}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'transparent' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          )}
        </header>
        <main style={{
          maxWidth: 1120, margin: '0 auto', padding: '20px 16px 64px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {children}
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

/** Who they are, as the portal understands them — and how to reach Seventh Sky. */
function Footer({ party, isProvider, token }) {
  return (
    <div className="wt-card" style={{ padding: 16, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12.5 }}>
        <div style={{ flex: '1 0 220px' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}>
            {isProvider ? 'Your details' : 'Account'}
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{isProvider ? party.business_name : party.name}</div>
          <div className="muted">{party.code}</div>
          {(party.contact_email || party.email) && (
            <div className="muted" style={{ marginTop: 4 }}><Mail size={11} style={{ verticalAlign: -1 }} /> {party.contact_email || party.email}</div>
          )}
          {(party.contact_phone || party.mobile) && (
            <div className="muted"><Phone size={11} style={{ verticalAlign: -1 }} /> {party.contact_phone || party.mobile}</div>
          )}
          {party.service_address && (
            <div className="muted"><MapPin size={11} style={{ verticalAlign: -1 }} /> {party.service_address}</div>
          )}
        </div>
        <div style={{ flex: '1 0 220px' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}>
            Something not right?
          </div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            {isProvider
              ? 'If a job, a rate or a payment here does not match what you were told, use Messages — it goes on the record with your name against it.'
              : 'If anything here is wrong, raise it under Requests & complaints. A complaint is tracked until it is resolved; a message is not.'}
          </p>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
        {token
          ? 'This is a private link. Please do not forward it — anyone who has it can see this page.'
          : 'You are signed in. Sign out when you are finished on a shared device.'}
      </p>
    </div>
  );
}

export default function Portal() {
  /*
   * Two ways in, one screen.
   *
   *   /portal/:token — a magic link, no account needed. Right for a client who
   *                    will decide one quotation and never come back.
   *   /portal        — a signed-in provider or client with their own login.
   *
   * The only difference is which API prefix the calls use, so the panels take
   * `base` and never need to know. The server returns the same whitelisted
   * dossier either way.
   */
  const { token } = useParams();
  const base = token ? `/public/wt-portal/${token}` : '/wt-portal';
  const meUrl = token ? base : `${base}/me`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(meUrl)
      .then((r) => setData(r.data))
      .catch((e) => {
        setData(null);
        setError(errText(e, token ? 'This link could not be opened' : 'Could not load your portal'));
      })
      .finally(() => setLoading(false));
  }, [meUrl, token]);
  useEffect(load, [load]);

  const signOut = async () => {
    try { await api.post('/auth/logout'); } catch { /* signing out locally is enough */ }
    window.location.href = '/admin/login';
  };

  if (loading) return <Shell title="Portal" subtitle="Loading…"><Loading /></Shell>;

  if (error || !data) {
    return (
      <Shell title="Portal" subtitle="Water Tank Services">
        <div className="wt-card">
          <EmptyState eyebrow="Link" title="This portal could not be opened" hint={error}
            action={<button className="wt-btn" onClick={load}><RefreshCw size={14} /> Try again</button>} />
        </div>
      </Shell>
    );
  }

  const isProvider = data.party_type === 'provider';
  const party = (isProvider ? data.provider : data.client) || {};
  const who = isProvider ? party.business_name : party.name;

  return (
    <Shell
      title={isProvider ? 'Provider Portal' : 'Customer Portal'}
      subtitle={[who, party.code].filter(Boolean).join(' · ')}
      onRefresh={load}
      right={!token && (
        <button className="wt-btn sm" onClick={signOut}
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'transparent' }}>
          <LogOut size={13} /> Sign out
        </button>
      )}
    >
      {isProvider
        ? <PortalProvider data={data} base={base} reload={load} />
        : <PortalClient data={data} base={base} reload={load} />}

      <Footer party={party} isProvider={isProvider} token={token} />
    </Shell>
  );
}
