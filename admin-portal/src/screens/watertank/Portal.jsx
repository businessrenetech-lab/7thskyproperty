import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CloudLightning, RefreshCw, LogOut, Phone, Mail, MapPin } from 'lucide-react';
import api from '../../services/api';
import { Loading, EmptyState, toast, errText, ToastHost, profileForLine } from './common';
import PortalClient from './PortalClient';
import PortalProvider from './PortalProvider';
import '../../styles/wt-scope.css';
import '../../styles/portal.css';

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

function Shell({ title, subtitle, children, onRefresh, right, profile }) {
  const p = profile || {};
  const accentStyle = p.accent ? { '--pp-accent': p.accent, '--pp-accent-ink': p.accent_ink, '--pp-accent-soft': p.accent_soft } : undefined;
  return (
    <div className="wt-scope ss-portal" style={accentStyle}>
      <header className="pp-header">
        <div className="pp-header-in">
          <span className="pp-mark"><CloudLightning size={20} /></span>
          <div className="pp-title">
            <div className="brand">Seventh Sky Property Care</div>
            <div className="who">{title}{subtitle ? <>  <small>· {subtitle}</small></> : null}</div>
          </div>
          {right}
          {onRefresh && (
            <button className="pp-hbtn" onClick={onRefresh}><RefreshCw size={13} /> Refresh</button>
          )}
        </div>
      </header>
      <main className="pp-main">{children}</main>
      <ToastHost />
    </div>
  );
}

/** Who they are, as the portal understands them — and how to reach Seventh Sky. */
function Footer({ party, isProvider, token }) {
  return (
    <div className="pp-foot">
      <div className="cols">
        <div className="col">
          <div className="lbl">{isProvider ? 'Your details' : 'Account'}</div>
          <div className="nm">{isProvider ? party.business_name : party.name}</div>
          <div className="meta">{party.code}</div>
          {(party.contact_email || party.email) && <div className="meta"><Mail size={12} /> {party.contact_email || party.email}</div>}
          {(party.contact_phone || party.mobile) && <div className="meta"><Phone size={12} /> {party.contact_phone || party.mobile}</div>}
          {party.service_address && <div className="meta"><MapPin size={12} /> {party.service_address}</div>}
        </div>
        <div className="col">
          <div className="lbl">Something not right?</div>
          <p className="note">
            {isProvider
              ? 'If a job, a rate or a payment here does not match what you were told, use Messages — it goes on the record with your name against it.'
              : 'If anything here is wrong, raise it under Requests & complaints. A complaint is tracked until it is resolved; a message is not.'}
          </p>
        </div>
      </div>
      <p className="fine">
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
      <Shell title="Portal">
        <div className="pp-empty">
          <RefreshCw size={24} />
          <div className="t">This portal could not be opened</div>
          <p className="h">{error}</p>
          <button className="pp-hbtn solid" style={{ marginTop: 16 }} onClick={load}><RefreshCw size={14} /> Try again</button>
        </div>
      </Shell>
    );
  }

  const isProvider = data.party_type === 'provider';
  const party = (isProvider ? data.provider : data.client) || {};
  const who = isProvider ? party.business_name : party.name;
  // The portal runs outside the console URL, so its wording comes from the
  // party's own service line, not the path.
  const profile = profileForLine(data.service_line);

  return (
    <Shell
      title={isProvider ? 'Provider Portal' : 'Customer Portal'}
      subtitle={[who, party.code].filter(Boolean).join(' · ')}
      onRefresh={load}
      profile={profile}
      right={!token && (
        <button className="pp-hbtn" onClick={signOut}><LogOut size={13} /> Sign out</button>
      )}
    >
      {isProvider
        ? <PortalProvider data={data} base={base} reload={load} eq={profile.equipment} />
        : <PortalClient data={data} base={base} reload={load} eq={profile.equipment} />}

      <Footer party={party} isProvider={isProvider} token={token} />
    </Shell>
  );
}
