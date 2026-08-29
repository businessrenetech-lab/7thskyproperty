import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, UserPlus, KeyRound, ShieldOff, ShieldCheck, Copy, Check, Mail, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav,
  WtHead, WtTabs, Pill, dateTimeFmt, Loading, EmptyState, toast, errText, titleCase,
} from './common';

/*
 * Portal Accounts — who can sign in, and who cannot yet.
 *
 * An account is created automatically the moment a provider's master agreement
 * or a client's service agreement is signed, and the credentials are emailed.
 * This screen exists for everything that path cannot cover: a provider onboarded
 * before portals existed, a client whose email was wrong, a password to reset,
 * access to stop today.
 *
 * The list deliberately includes parties who CANNOT be invited, carrying the
 * reason. Hiding them would leave an operator wondering why someone never
 * appears, when the answer is simply that there is no email on file.
 */

const TABS = ['All', 'Providers', 'Clients'];

const FILTERS = [
  ['', 'Everyone'],
  ['without_account', 'No account yet'],
  ['never_signed_in', 'Invited, never signed in'],
  ['with_account', 'Has an account'],
];

export default function PortalAccounts() {
  const nav = useSvcNav();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('All');
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [issued, setIssued] = useState(null);   // shown once
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = {};
    if (tab === 'Providers') params.party_type = 'provider';
    if (tab === 'Clients') params.party_type = 'client';
    if (filter) params.filter = filter;
    if (q.trim()) params.q = q.trim();

    api.get('/wt-ops/portal-accounts', { params })
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setError(errText(e, 'Could not load portal accounts')); })
      .finally(() => setLoading(false));
  }, [tab, filter, q]);
  useEffect(load, [load]);

  const act = async (row, path, body, key) => {
    setBusy(`${row.party_type}-${row.id}-${key}`);
    try {
      const r = await api.post(`/wt-ops/portal-accounts/${row.party_type}/${row.id}${path}`, body || {});
      toast.ok(r.data.message || 'Done.');
      // The temporary password comes back exactly once. Held in state so the
      // operator can pass it on when the email does not arrive; it cannot be
      // fetched again afterwards.
      if (r.data.temporary_password) {
        setIssued({ ...r.data, name: row.name });
        if (!r.data.email_sent) toast.err('The email did not send — copy the password below and pass it on.');
      }
      load();
    } catch (e) { toast.err(errText(e, 'That did not work')); }
    finally { setBusy(''); }
  };

  const copy = () => {
    navigator.clipboard.writeText(issued.temporary_password)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
      .catch(() => toast.err('Could not copy — select it and copy by hand.'));
  };

  const rows = data?.rows || [];
  const s = data?.summary || {};

  if (loading && !data) return (<><WtHead title="Portal Accounts" subtitle="Provider and customer logins" /><Loading /></>);

  if (error) return (
    <>
      <WtHead title="Portal Accounts" subtitle="Provider and customer logins" />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load portal accounts" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  return (
    <>
      <WtHead title="Portal Accounts" subtitle="Who can sign in to the provider and customer portals"
        search={q} onSearch={setQ}>
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </WtHead>

      <div className="wt-kpis">
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">With an account</span><b>{s.with_account || 0}</b>
          <span className="wt-kpi-sub">of {s.total || 0} parties</span></div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Invited, never signed in</span>
          <b style={{ color: s.never_signed_in ? '#b45309' : undefined }}>{s.never_signed_in || 0}</b>
          <span className="wt-kpi-sub">worth chasing</span>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Signed, no account</span>
          <b>{s.awaiting_invite || 0}</b>
          <span className="wt-kpi-sub">agreement done, not invited</span>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">No email on file</span>
          <b>{s.no_email || 0}</b>
          <span className="wt-kpi-sub">cannot be invited</span>
        </div>
      </div>

      {issued && (
        <div className="wt-card" style={{ padding: 18, borderLeft: '3px solid var(--wt-accent)' }}>
          <h2 className="wt-section-title" style={{ marginBottom: 8 }}>
            Temporary password for {issued.name}
          </h2>
          <p className="wt-subtitle">
            {issued.email_sent
              ? `Emailed to ${issued.email}. Shown here once in case it does not arrive — it cannot be recovered afterwards.`
              : `The email did not send. Pass this on yourself — it cannot be shown again.`}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="wt-input" readOnly value={issued.temporary_password}
              onFocus={(e) => e.target.select()}
              style={{ flex: '0 1 280px', fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 }} />
            <button className="wt-btn primary" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="wt-btn" onClick={() => setIssued(null)}>Done</button>
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginBottom: 0, marginTop: 8 }}>
            They will be asked to choose their own password the first time they sign in.
          </p>
        </div>
      )}

      <div className="wt-card wt-tblcard">
        <WtTabs tabs={TABS} value={tab} onChange={setTab} />

        <div style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="wt-subtitle" style={{ margin: 0 }}>Show</span>
          {FILTERS.map(([k, l]) => (
            <button key={k || 'all'} className={`wt-btn sm${filter === k ? ' primary' : ''}`}
              onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>

        {rows.length ? (
          <table className="wt-tbl">
            <thead>
              <tr>
                <th style={{ width: 96 }}>Code</th>
                <th>Name</th>
                <th style={{ width: 90 }}>Type</th>
                <th>Sign-in email</th>
                <th style={{ width: 150 }}>Account</th>
                <th style={{ width: 260 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.party_type}-${r.id}`;
                const acct = r.account;
                return (
                  <tr key={key}>
                    <td className="id">{r.code}</td>
                    <td>
                      <strong>{r.name}</strong>
                      {r.contact && r.contact !== r.name && <div className="muted" style={{ fontSize: 11 }}>{r.contact}</div>}
                      {r.agreement_signed && <Pill value="Agreement signed" sm force="green" />}
                    </td>
                    <td className="muted">{titleCase(r.party_type)}</td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {r.email || <span style={{ color: 'var(--wt-red)' }}>
                        <AlertTriangle size={11} style={{ verticalAlign: -1 }} /> {r.blocked_reason}
                      </span>}
                    </td>
                    <td>
                      {!r.has_account ? <span className="muted">—</span> : (
                        <>
                          <Pill value={acct.status === 'suspended' ? 'Suspended' : 'Active'} sm
                            force={acct.status === 'suspended' ? 'red' : 'green'} />
                          <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                            {acct.awaiting_first_sign_in
                              ? 'never signed in'
                              : acct.last_login_at ? `last in ${dateTimeFmt(acct.last_login_at)}` : 'signed in'}
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!r.has_account && (
                        <button className="wt-btn sm primary" disabled={!r.can_provision || busy === `${key}-new`}
                          title={r.can_provision ? 'Create the login and email the credentials' : r.blocked_reason}
                          onClick={() => act(r, '', {}, 'new')}>
                          <UserPlus size={13} /> Create access
                        </button>
                      )}
                      {r.has_account && (
                        <>
                          <button className="wt-btn sm" disabled={busy === `${key}-reset`}
                            title="Set a new temporary password and email it"
                            onClick={() => act(r, '', { reset: true }, 'reset')}>
                            <KeyRound size={13} /> Reset password
                          </button>{' '}
                          {acct.status === 'suspended' ? (
                            <button className="wt-btn sm" onClick={() => act(r, '/reinstate', {}, 'on')}>
                              <ShieldCheck size={13} /> Restore
                            </button>
                          ) : (
                            <button className="wt-btn sm danger-ghost" onClick={() => act(r, '/suspend', {}, 'off')}>
                              <ShieldOff size={13} /> Suspend
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState eyebrow="Portal accounts"
            title={q ? 'Nothing matches that search' : 'Nobody in this filter'}
            hint="Accounts are created automatically when an agreement is signed — this list is for the exceptions." />
        )}
      </div>

      <div className="wt-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Mail size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--wt-muted)' }} />
        <div style={{ fontSize: 12.5, color: 'var(--wt-ink-2)' }}>
          <b>How access is normally granted.</b> When a provider&rsquo;s master agreement or a
          client&rsquo;s service agreement is fully signed, their login is created and the
          credentials are emailed automatically. They choose their own password on first
          sign-in, and can reset it themselves from the sign-in page. Nothing here needs
          doing unless that path did not apply.
        </div>
      </div>
    </>
  );
}
