import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  CloudLightning, RefreshCw, Check, X, CalendarDays, PlayCircle, CheckCircle2,
  FileSignature, Download, Send, Clock, AlertTriangle, Shield, Receipt,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Pill, Loading, EmptyState, toast, errText, ToastHost } from './common';
import '../../styles/wt-scope.css';

/*
 * Portal — one public page, two audiences.
 *
 * External parties previously did none of their own steps: a provider accepted a
 * job by telephoning the office, who clicked Accept for them; a client asked for
 * their invoice and someone emailed a PDF. Both are staff impersonating someone
 * else, and for anything meant to be the other party's decision, it was not
 * really their decision.
 *
 * The token in the URL is the credential — there is no login. The server decides
 * which portal this is and returns only that party's whitelisted data, so this
 * screen never has to know what it is allowed to show; it renders what it is
 * given. That is deliberate: a filter implemented on the client is not a filter.
 */

const num = (v) => Number(v || 0);

function Shell({ title, subtitle, children, onRefresh }) {
  return (
    <div className="wt-scope">
      <div style={{ minHeight: '100vh', background: 'var(--wt-bg, #f8fafc)' }}>
        <header style={{
          background: 'var(--wt-sidebar)', color: '#fff', padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span className="wt-brand-mark"><CloudLightning size={20} /></span>
          <div style={{ flex: '1 0 0', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Seventh Sky — {title}</div>
            <div style={{ fontSize: 11.5, opacity: 0.75 }}>{subtitle}</div>
          </div>
          {onRefresh && (
            <button className="wt-btn sm" onClick={onRefresh} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'transparent' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          )}
        </header>
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '22px 18px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {children}
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

const Row = ({ label, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: '1px solid var(--wt-line)', fontSize: 13 }}>
    <span className="muted" style={{ fontSize: 12 }}>{label}</span>
    <span style={{ textAlign: 'right' }}>{children ?? '—'}</span>
  </div>
);

/* ── provider ──────────────────────────────────────────────────────────── */

function CompleteForm({ wo, onDone, onCancel, base }) {
  const [f, setF] = useState({ notes: '', summary: '', findings: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const go = async () => {
    if (!f.summary.trim() && !f.notes.trim()) { setErr('Say what you did before marking it complete.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.post(`${base}/work-orders/${wo.code}/complete`, f);
      toast.ok(r.data.message);
      onDone();
    } catch (e) { setErr(errText(e, 'Could not submit this')); setBusy(false); }
  };

  return (
    <div className="wt-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-field">
        <label>What did you do?</label>
        <textarea className="wt-input" rows={3} value={f.summary} onChange={set('summary')}
          placeholder="e.g. Drained, scrubbed and disinfected both rooftop tanks; flushed lines." />
      </div>
      <div className="wt-field">
        <label>Anything Seventh Sky should know?</label>
        <textarea className="wt-input" rows={2} value={f.findings} onChange={set('findings')}
          placeholder="Findings, damage noticed, follow-up needed…" />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="wt-btn" onClick={onCancel}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={go}>
          <CheckCircle2 size={14} /> {busy ? 'Submitting…' : 'Submit as complete'}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
        Seventh Sky verifies the work before payment is released — submitting this does not sign it off.
      </p>
    </div>
  );
}

function ProviderPortal({ data, base, reload }) {
  const [completing, setCompleting] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState('');

  const act = async (wo, path, body, label) => {
    setBusy(`${wo.code}-${path}`);
    try {
      const r = await api.post(`${base}/work-orders/${wo.code}/${path}`, body || {});
      toast.ok(r.data.message || label);
      (r.data.warnings || []).forEach((w) => toast.ok(w));
      setScheduling(null); setDate('');
      reload();
    } catch (e) { toast.err(errText(e, 'That did not work')); }
    finally { setBusy(''); }
  };

  const signLink = async (wo) => {
    try {
      const r = await api.post(`${base}/work-orders/${wo.code}/signing-link`);
      window.location.href = r.data.signing_path;
    } catch (e) { toast.err(errText(e, 'Could not open the document')); }
  };

  const t = data.totals || {};

  return (
    <>
      <div className="wt-kpis">
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Open jobs</span><b>{t.open}</b></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Earned</span><b>{bdt(t.earned)}</b></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Paid to you</span><b>{bdt(t.paid)}</b></div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Outstanding</span>
          <b style={{ color: t.outstanding > 0 ? '#b45309' : undefined }}>{bdt(t.outstanding)}</b>
        </div>
      </div>

      {data.work_orders.length === 0 && (
        <div className="wt-card"><EmptyState eyebrow="Jobs" title="Nothing assigned to you yet"
          hint="When Seventh Sky assigns you a job it will appear here." /></div>
      )}

      {data.work_orders.map((w) => {
        const isNew = String(w.status).toLowerCase() === 'issued';
        return (
          <div className="wt-card" style={{ padding: 18 }} key={w.code}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 0 220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <strong style={{ fontSize: 15 }}>{w.code}</strong>
                  <Pill value={w.status} sm />
                  {w.needs_signature && <Pill value="Signature needed" sm force="amber" />}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                  {w.client_name}{w.site_address ? ` · ${w.site_address}` : ''}
                </div>
                {w.scope && <div style={{ fontSize: 12.5, marginTop: 7 }}>{w.scope}</div>}
              </div>
              <div style={{ textAlign: 'right', minWidth: 150 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{bdt(w.fee)}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {w.paid > 0 ? `${bdt(w.paid)} paid` : 'not yet paid'}
                  {w.payout_status ? ` · ${w.payout_status}` : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, marginTop: 12 }}>
              <Row label="Target date">{w.target_date ? dateFmt(w.target_date) : '—'}</Row>
              <Row label="Booked for">{w.scheduled_date ? dateFmt(w.scheduled_date) : '—'}</Row>
            </div>

            {/* Only the actions legitimately available in this state are offered. */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {isNew && (
                <>
                  <button className="wt-btn primary" disabled={!!busy}
                    onClick={() => act(w, 'respond', { accept: true }, 'Accepted')}>
                    <Check size={14} /> Accept this job
                  </button>
                  <button className="wt-btn" disabled={!!busy}
                    onClick={() => act(w, 'respond', { accept: false }, 'Declined')}>
                    <X size={14} /> Decline
                  </button>
                </>
              )}
              {['accepted'].includes(String(w.status).toLowerCase()) && (
                scheduling === w.code ? (
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="wt-input" type="date" value={date} style={{ width: 170 }}
                      onChange={(e) => setDate(e.target.value)} />
                    <button className="wt-btn primary" disabled={!date || !!busy}
                      onClick={() => act(w, 'schedule', { date }, 'Scheduled')}>Confirm</button>
                    <button className="wt-btn" onClick={() => setScheduling(null)}>Cancel</button>
                  </span>
                ) : (
                  <button className="wt-btn" onClick={() => { setScheduling(w.code); setDate(w.scheduled_date || ''); }}>
                    <CalendarDays size={14} /> Book a date
                  </button>
                )
              )}
              {['scheduled', 'accepted'].includes(String(w.status).toLowerCase()) && (
                <button className="wt-btn" disabled={!!busy} onClick={() => act(w, 'start', {}, 'Started')}>
                  <PlayCircle size={14} /> Start work
                </button>
              )}
              {['in progress', 'scheduled'].includes(String(w.status).toLowerCase()) && (
                <button className="wt-btn primary" onClick={() => setCompleting(completing === w.code ? null : w.code)}>
                  <CheckCircle2 size={14} /> Mark complete & report
                </button>
              )}
              {w.needs_signature && (
                <button className="wt-btn" onClick={() => signLink(w)}>
                  <FileSignature size={14} /> Sign the work order
                </button>
              )}
            </div>

            {completing === w.code && (
              <CompleteForm wo={w} base={base}
                onCancel={() => setCompleting(null)}
                onDone={() => { setCompleting(null); reload(); }} />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ── customer ──────────────────────────────────────────────────────────── */

function CustomerPortal({ data, base, reload }) {
  const [busy, setBusy] = useState('');
  const t = data.totals || {};

  const decide = async (q, decision) => {
    setBusy(q.code);
    try {
      const r = await api.post(`${base}/quotations/${q.code}/decision`, { decision });
      toast.ok(r.data.message);
      reload();
    } catch (e) { toast.err(errText(e, 'Could not record that')); }
    finally { setBusy(''); }
  };

  /*
   * Opened in a new tab rather than fetched, so the browser renders the PDF
   * itself. On the token path the credential is in the URL; on the session path
   * the auth cookie travels with the request, which is why this works without
   * an Authorization header.
   */
  const openPdf = (inv) => {
    const apiRoot = api.defaults.baseURL || '';
    window.open(`${apiRoot}${base}/invoices/${inv.code}/pdf`, '_blank');
  };

  return (
    <>
      <div className="wt-kpis">
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Outstanding</span>
          <b style={{ color: t.outstanding > 0 ? 'var(--wt-red)' : undefined }}>{bdt(t.outstanding)}</b>
        </div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Quotations to review</span><b>{t.open_quotations}</b></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Active AMC</span><b>{t.active_amc}</b></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Upcoming visits</span><b>{t.upcoming_visits}</b></div>
      </div>

      {data.quotations.length > 0 && (
        <div className="wt-card" style={{ padding: 18 }}>
          <h2 className="wt-section-title" style={{ marginBottom: 12 }}>Your quotations</h2>
          {data.quotations.map((q) => (
            <div key={q.code} style={{ borderTop: '1px solid var(--wt-line)', paddingTop: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{q.code}</strong>
                <Pill value={q.decision} sm />
                <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800 }}>{bdt(q.total)}</span>
              </div>
              {q.lines.length > 0 && (
                <table className="wt-tbl" style={{ marginTop: 8 }}>
                  <tbody>
                    {q.lines.map((l, i) => (
                      <tr key={`${q.code}-${i}`}>
                        <td>{l.name}</td>
                        <td className="muted" style={{ width: 90 }}>{l.qty} {l.unit}</td>
                        <td style={{ width: 110, textAlign: 'right' }}>{bdt(l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {['pending', 'sent'].includes(String(q.decision).toLowerCase()) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="wt-btn primary" disabled={busy === q.code} onClick={() => decide(q, 'Approved')}>
                    <Check size={14} /> Accept this quotation
                  </button>
                  <button className="wt-btn" disabled={busy === q.code} onClick={() => decide(q, 'Rejected')}>
                    <X size={14} /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.invoices.length > 0 && (
        <div className="wt-card" style={{ padding: 18 }}>
          <h2 className="wt-section-title" style={{ marginBottom: 12 }}>
            <Receipt size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Invoices & receipts
          </h2>
          <table className="wt-tbl">
            <thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Outstanding</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.code}>
                  <td className="id">{i.code}</td>
                  <td className="muted">{dateFmt(i.issue_date)}</td>
                  <td className="muted">{i.due_date ? dateFmt(i.due_date) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(i.amount)}</td>
                  <td style={{ textAlign: 'right', color: num(i.outstanding) > 0 ? 'var(--wt-red)' : undefined }}>{bdt(i.outstanding)}</td>
                  <td><Pill value={i.status} sm /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="wt-btn sm" onClick={() => openPdf(i)}><Download size={12} /> PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Receipts, so a client can reconcile without having to ask. */}
          {data.invoices.some((i) => i.receipts.length) && (
            <div style={{ marginTop: 14 }}>
              <h3 className="wt-section-title" style={{ fontSize: 12.5 }}>Payments received</h3>
              {data.invoices.flatMap((i) => i.receipts.map((p, n) => (
                <Row key={`${i.code}-${n}`} label={`${i.code} · ${p.method || 'payment'}${p.reference ? ` · ${p.reference}` : ''}`}>
                  {bdt(p.amount)} <span className="muted">{p.received_on ? dateFmt(p.received_on) : ''}</span>
                </Row>
              )))}
            </div>
          )}
        </div>
      )}

      {data.work_orders.length > 0 && (
        <div className="wt-card" style={{ padding: 18 }}>
          <h2 className="wt-section-title" style={{ marginBottom: 12 }}>Your service history</h2>
          <table className="wt-tbl">
            <thead><tr><th>Job</th><th>Service</th><th>Provider</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {data.work_orders.map((w) => (
                <tr key={w.code}>
                  <td className="id">{w.code}</td>
                  <td>{w.category || w.scope || '—'}</td>
                  <td className="muted">{w.provider_name || '—'}</td>
                  <td className="muted">{dateFmt(w.scheduled_date || w.target_date)}</td>
                  <td><Pill value={w.status} sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.amc.map((a) => (
        <div className="wt-card" style={{ padding: 18 }} key={a.code}>
          <h2 className="wt-section-title" style={{ marginBottom: 10 }}>
            <Shield size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            {a.package || 'Maintenance contract'} · {a.code}
          </h2>
          <Row label="Cover"><Pill value={a.status} sm /> {dateFmt(a.start_date)} → {dateFmt(a.end_date)}</Row>
          <Row label="Frequency">{a.frequency}</Row>
          {a.visits.length > 0 && (
            <table className="wt-tbl" style={{ marginTop: 10 }}>
              <thead><tr><th style={{ width: 40 }}>#</th><th>Visit</th><th>Due</th><th>Completed</th><th>Status</th></tr></thead>
              <tbody>
                {a.visits.map((v) => (
                  <tr key={`${a.code}-${v.visit_no}`}>
                    <td className="id">{v.visit_no}</td>
                    <td>{v.visit_type}</td>
                    <td className="muted">{dateFmt(v.due_date)}</td>
                    <td className="muted">{v.completed_date ? dateFmt(v.completed_date) : '—'}</td>
                    <td><Pill value={v.status} sm /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {data.warranties.length > 0 && (
        <div className="wt-card" style={{ padding: 18 }}>
          <h2 className="wt-section-title" style={{ marginBottom: 12 }}>Your warranties</h2>
          {data.warranties.map((w) => (
            <Row key={w.code} label={`${w.warranty_type || 'Warranty'} · ${w.code}`}>
              <Pill value={w.status} sm /> until {dateFmt(w.expiry_date)}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}

/* ── message box, shared ───────────────────────────────────────────────── */

function MessageBox({ base }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await api.post(`${base}/message`, { body });
      toast.ok(r.data.message);
      setBody('');
    } catch (e) { toast.err(errText(e, 'Could not send that')); }
    finally { setBusy(false); }
  };

  return (
    <div className="wt-card" style={{ padding: 18 }}>
      <h2 className="wt-section-title" style={{ marginBottom: 10 }}>Message Seventh Sky</h2>
      <textarea className="wt-input" rows={3} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Anything you need to tell us…" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 9 }}>
        <button className="wt-btn primary" disabled={busy || !body.trim()} onClick={send}>
          <Send size={14} /> {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

/* ── screen ────────────────────────────────────────────────────────────── */

export default function Portal() {
  /*
   * Two ways in, one screen.
   *
   *   /portal/:token — a magic link, no account needed. Right for a client who
   *                    will decide one quotation and never come back.
   *   /portal        — a signed-in provider or client with their own login.
   *
   * The only difference is which API prefix the calls use, so the components
   * below take `api` paths built from one base and never need to know. The
   * server returns the same whitelisted dossier either way.
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

  if (loading) return <Shell title="Portal" subtitle="Loading…"><Loading /></Shell>;

  if (error || !data) {
    return (
      <Shell title="Portal" subtitle="Water Tank Services">
        <div className="wt-card">
          <EmptyState eyebrow="Link" title="This link cannot be opened" hint={error}
            action={<button className="wt-btn" onClick={load}><RefreshCw size={14} /> Try again</button>} />
        </div>
      </Shell>
    );
  }

  const isProvider = data.party_type === 'provider';
  const who = isProvider ? data.provider?.business_name : data.client?.name;

  return (
    <Shell
      title={isProvider ? 'Provider Portal' : 'Customer Portal'}
      subtitle={who}
      onRefresh={load}
    >
      {isProvider
        ? <ProviderPortal data={data} base={base} reload={load} />
        : <CustomerPortal data={data} base={base} reload={load} />}
      <MessageBox base={base} />
      <p className="muted" style={{ fontSize: 11.5, textAlign: 'center' }}>
        This is a private link. Please do not forward it — anyone who has it can see this page.
      </p>
    </Shell>
  );
}
