import React, { useState } from 'react';
import {
  Home, Briefcase, Camera, Banknote, ShieldCheck, TrendingUp, Send,
  Check, X, CalendarDays, PlayCircle, CheckCircle2, FileSignature,
  MessageSquareWarning, ClipboardCheck,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Pill, toast, errText } from './common';
import Photos from './Photos';
import {
  Kpi, Alerts, PortalTabs, Expandable, Facts, Nothing, SectionTitle,
  ExpiryChip, num, lower,
} from './portalBits';
import { Messages } from './PortalClient';

/*
 * The provider portal.
 *
 * What it was: a list of job cards with accept/schedule/start/complete. Useful,
 * and about a fifth of what a contractor working for Seventh Sky relates to.
 *
 * Everything added here answers a question a provider currently has to telephone
 * the office to ask, and two of them are questions they cannot ask because they
 * do not know to:
 *
 *   "What am I paid for this?"        → their agreement and rate card
 *   "Have I been paid?"               → a payout statement with voucher numbers
 *   "What did I report on that job?"  → their own filed reports and photographs
 *   "Why is my rating falling?"       → complaints and incidents involving them
 *   "Is my insurance about to lapse?" → COMPLIANCE, with days remaining
 *
 * That last one is the important one. Lapsed compliance is the commonest reason
 * a provider is suspended, the expiry date lives in Seventh Sky's system rather
 * than theirs, and the first they hear of it is being stood down. Putting the
 * countdown in front of them costs nothing and prevents the whole event.
 */

/* ── job actions ───────────────────────────────────────────────────────── */

function CompleteForm({ wo, onDone, onCancel, base }) {
  const [f, setF] = useState({ notes: '', summary: '', findings: '', photos_before: [], photos_after: [] });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-field">
        <label>What did you do?</label>
        <textarea className="wt-input" rows={3} value={f.summary} onChange={set('summary')}
          placeholder="e.g. Drained, scrubbed and disinfected both rooftop tanks; flushed lines." />
      </div>
      <Photos label="Photos before the work" photos={f.photos_before}
        uploadUrl={`${base}/work-orders/${wo.code}/photos`} portalBase={base}
        onChange={(x) => setF((s) => ({ ...s, photos_before: x }))}
        hint="Add a note to each photo — it is what makes the picture useful, and what protects you if the work is later questioned." />
      <Photos label="Photos after the work" photos={f.photos_after}
        uploadUrl={`${base}/work-orders/${wo.code}/photos`} portalBase={base}
        onChange={(x) => setF((s) => ({ ...s, photos_after: x }))} />
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

function JobCard({ w, base, reload, defaultOpen }) {
  const [completing, setCompleting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [date, setDate] = useState(w.scheduled_date || '');
  const [busy, setBusy] = useState('');
  const status = lower(w.status);

  const act = async (path, body, label) => {
    setBusy(path);
    try {
      const r = await api.post(`${base}/work-orders/${w.code}/${path}`, body || {});
      toast.ok(r.data.message || label);
      (r.data.warnings || []).forEach((x) => toast.ok(x));
      setScheduling(false);
      reload();
    } catch (e) { toast.err(errText(e, 'That did not work')); }
    finally { setBusy(''); }
  };

  const signLink = async () => {
    try {
      const r = await api.post(`${base}/work-orders/${w.code}/signing-link`);
      window.location.href = r.data.signing_path;
    } catch (e) { toast.err(errText(e, 'Could not open the document')); }
  };

  return (
    <Expandable
      title={`${w.category || 'Service'} · ${w.code}`}
      subtitle={[w.client_name, w.site_address].filter(Boolean).join(' · ')}
      defaultOpen={defaultOpen}
      badge={<>
        <Pill value={w.status} sm />
        {w.needs_signature && <span className="wt-chip warn">signature needed</span>}
      </>}
      right={<span style={{ textAlign: 'right' }}>
        <b style={{ fontSize: 15, display: 'block' }}>{bdt(w.fee)}</b>
        <span className="muted" style={{ fontSize: 11.5 }}>
          {w.paid > 0 ? `${bdt(w.paid)} paid` : 'not yet paid'}
        </span>
      </span>}>
      {w.scope && <p style={{ fontSize: 13, marginTop: 12 }}>{w.scope}</p>}

      <Facts items={[
        ['Target date', w.target_date ? dateFmt(w.target_date) : null],
        ['Booked for', w.scheduled_date ? dateFmt(w.scheduled_date) : 'not booked'],
        ['Started', w.started_at ? dateFmt(w.started_at) : null],
        ['Completed', w.completed_at ? dateFmt(w.completed_at) : null],
        ['Verified by Seventh Sky', w.verified_at ? dateFmt(w.verified_at) : 'not yet'],
        ['Your fee', bdt(w.fee)],
        ['Paid to you', bdt(w.paid)],
        ['Still owed', bdt(w.outstanding)],
        ['Payout status', w.payout_status],
      ]} />

      {(w.lines || []).length > 0 && (
        <>
          <SectionTitle>What the job covers</SectionTitle>
          <table className="wt-tbl" style={{ marginTop: 6 }}>
            <tbody>
              {w.lines.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}><td>{l.name}</td><td className="muted" style={{ width: 90 }}>{l.qty} {l.unit || ''}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        {status === 'issued' && (
          <>
            <button className="wt-btn primary" disabled={!!busy} onClick={() => act('respond', { accept: true }, 'Accepted')}>
              <Check size={14} /> Accept this job
            </button>
            <button className="wt-btn" disabled={!!busy} onClick={() => act('respond', { accept: false }, 'Declined')}>
              <X size={14} /> Decline
            </button>
          </>
        )}
        {status === 'accepted' && (scheduling ? (
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="wt-input" type="date" value={date} style={{ width: 170 }}
              onChange={(e) => setDate(e.target.value)} />
            <button className="wt-btn primary" disabled={!date || !!busy} onClick={() => act('schedule', { date }, 'Scheduled')}>Confirm</button>
            <button className="wt-btn" onClick={() => setScheduling(false)}>Cancel</button>
          </span>
        ) : (
          <button className="wt-btn" onClick={() => setScheduling(true)}>
            <CalendarDays size={14} /> Book a date
          </button>
        ))}
        {['scheduled', 'accepted'].includes(status) && (
          <button className="wt-btn" disabled={!!busy} onClick={() => act('start', {}, 'Started')}>
            <PlayCircle size={14} /> Start work
          </button>
        )}
        {['in progress', 'scheduled'].includes(status) && (
          <button className="wt-btn primary" onClick={() => setCompleting((v) => !v)}>
            <CheckCircle2 size={14} /> Mark complete &amp; report
          </button>
        )}
        {w.needs_signature && (
          <button className="wt-btn" onClick={signLink}>
            <FileSignature size={14} /> Sign the work order
          </button>
        )}
      </div>

      {completing && (
        <CompleteForm wo={w} base={base}
          onCancel={() => setCompleting(false)}
          onDone={() => { setCompleting(false); reload(); }} />
      )}
    </Expandable>
  );
}

/* ── panels ────────────────────────────────────────────────────────────── */

function Overview({ data, base, reload, go }) {
  const t = data.totals || {};
  const q = data.queues || {};
  const needsYou = [...(q.awaiting_response || []), ...(q.awaiting_signature || [])];

  return (
    <>
      <div className="wt-kpis">
        <Kpi label="Jobs open" value={t.open || 0} sub="assigned to you" onClick={() => go('jobs')} />
        <Kpi label="Earned" value={bdt(t.earned)} sub="across every job" />
        <Kpi label="Paid to you" value={bdt(t.paid)} tone="good" onClick={() => go('earnings')} />
        <Kpi label="Still owed" value={bdt(t.outstanding)} tone={t.outstanding > 0 ? 'warn' : undefined}
          sub={t.outstanding > 0 ? 'released after verification' : 'nothing outstanding'}
          onClick={() => go('earnings')} />
      </div>

      {needsYou.length > 0 && (
        <>
          <SectionTitle count={needsYou.length} hint="These are waiting on you, not on Seventh Sky.">
            Needs you now
          </SectionTitle>
          {needsYou.map((w) => <JobCard key={w.code} w={w} base={base} reload={reload} defaultOpen />)}
        </>
      )}

      {(q.in_progress || []).length > 0 && (
        <>
          <SectionTitle count={q.in_progress.length}>In progress</SectionTitle>
          {q.in_progress.map((w) => <JobCard key={w.code} w={w} base={base} reload={reload} />)}
        </>
      )}

      {(q.scheduled || []).length > 0 && (
        <>
          <SectionTitle count={q.scheduled.length}>Booked in</SectionTitle>
          {q.scheduled.map((w) => <JobCard key={w.code} w={w} base={base} reload={reload} />)}
        </>
      )}

      {needsYou.length === 0 && !(q.in_progress || []).length && !(q.scheduled || []).length && (
        <Nothing icon={Briefcase} title="Nothing needs you right now"
          hint="When Seventh Sky assigns you a job it appears here. Everything you have already done is under Jobs." />
      )}
    </>
  );
}

function Jobs({ data, base, reload }) {
  const jobs = data.work_orders || [];
  return (
    <>
      <SectionTitle count={jobs.length}>Every job assigned to you</SectionTitle>
      {jobs.length === 0 ? (
        <Nothing icon={Briefcase} title="No jobs yet"
          hint="Seventh Sky assigns work from the jobs board. Once you are assigned one it appears here with its scope, dates and your fee." />
      ) : jobs.map((w) => <JobCard key={w.code} w={w} base={base} reload={reload} />)}
    </>
  );
}

function Reports({ data }) {
  const reports = data.reports || [];
  return (
    <>
      <SectionTitle count={reports.length}
        hint="Every report you have filed, with the photographs you took. This is your record of what was done and the evidence behind it.">
        Your service reports
      </SectionTitle>
      {reports.length === 0 ? (
        <Nothing icon={Camera} title="No reports filed"
          hint="When you mark a job complete you file a report with before and after photographs. They stay here as your record." />
      ) : reports.map((r) => (
        <Expandable key={r.code} title={`${r.report_type} · ${r.code}`}
          subtitle={[r.submitted_date ? dateFmt(r.submitted_date) : null, r.client_name, r.work_order_code]
            .filter(Boolean).join(' · ')}
          badge={<>
            <Pill value={r.status} sm />
            {r.filed_via === 'staff' && <span className="wt-chip" style={{ cursor: 'default' }}>filed by Seventh Sky</span>}
          </>}>
          {r.summary && <p style={{ fontSize: 13, marginTop: 12 }}><b>What you did: </b>{r.summary}</p>}
          {r.findings && <p style={{ fontSize: 13 }}><b>Findings: </b>{r.findings}</p>}
          {/*
            * The review note IS shown to the provider, unlike to the client:
            * "photos unclear, please resubmit" is exactly what they need to read,
            * and hiding it would leave them guessing why a report was sent back.
            */}
          {r.review_notes && (
            <div className="wt-note" style={{ marginTop: 10 }}>
              <b>Seventh Sky's review{r.reviewed_date ? ` (${dateFmt(r.reviewed_date)})` : ''}: </b>{r.review_notes}
            </div>
          )}
          {(r.photos_before || []).length > 0 && <Photos key={`${r.code}-b`} readOnly label="Before" photos={r.photos_before} />}
          {(r.photos_after || []).length > 0 && <Photos key={`${r.code}-a`} readOnly label="After" photos={r.photos_after} />}
        </Expandable>
      ))}
    </>
  );
}

function Earnings({ data }) {
  const payouts = data.payouts || [];
  const agreement = data.agreement;
  const t = data.totals || {};
  const unpaid = (data.work_orders || []).filter((w) => num(w.outstanding) > 0);

  return (
    <>
      <div className="wt-kpis">
        <Kpi label="Earned" value={bdt(t.earned)} />
        <Kpi label="Paid" value={bdt(t.paid)} tone="good" />
        <Kpi label="Still owed" value={bdt(t.outstanding)} tone={t.outstanding > 0 ? 'warn' : undefined} />
        <Kpi label="Payments received" value={payouts.length} />
      </div>

      {agreement && (
        <Expandable title={`Your agreement · ${agreement.code}`} defaultOpen
          subtitle={`Version ${agreement.version_no}${agreement.payment_model ? ` · ${agreement.payment_model}` : ''}`}
          badge={<Pill value={agreement.status} sm />}>
          <Facts items={[
            ['Payment model', agreement.payment_model],
            ['When you are paid', agreement.payout_trigger],
            ['Payment due within', agreement.payment_due_days ? `${agreement.payment_due_days} days` : null],
            ['Commission', agreement.commission_pct ? `${agreement.commission_pct}%` : null],
            ['Term', agreement.term_months ? `${agreement.term_months} months` : null],
            ['Notice period', agreement.notice_days ? `${agreement.notice_days} days` : null],
            ['Effective from', agreement.effective_date ? dateFmt(agreement.effective_date) : null],
            ['Expires', agreement.expiry_date ? dateFmt(agreement.expiry_date) : null],
          ]} />
          {agreement.payment_terms && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>{agreement.payment_terms}</p>
          )}
          {(agreement.rates || []).length > 0 && (
            <>
              <SectionTitle count={agreement.rates.length} hint="What you are paid for each service under this agreement.">
                Your rates
              </SectionTitle>
              <table className="wt-tbl" style={{ marginTop: 6 }}>
                <thead><tr><th>Service</th><th style={{ width: 80 }}>Unit</th><th style={{ width: 110, textAlign: 'right' }}>Your rate</th></tr></thead>
                <tbody>
                  {agreement.rates.map((r, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={i}>
                      <td>{r.service_name || r.service_code}</td>
                      <td className="muted">{r.unit || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Expandable>
      )}

      <SectionTitle count={payouts.length}
        hint="Every payment Seventh Sky has made to you, with its voucher number so you can match it to your bank.">
        Payments received
      </SectionTitle>
      {payouts.length === 0 ? (
        <Nothing icon={Banknote} title="No payments yet"
          hint="Payments are released after Seventh Sky verifies the completed work. Each one gets a numbered voucher which appears here." />
      ) : (
        <div className="wt-card wt-tblcard">
          <div style={{ overflowX: 'auto' }}>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 90 }}>Voucher</th><th style={{ width: 90 }}>Paid on</th>
                <th>For</th><th style={{ width: 100 }}>Method</th>
                <th style={{ width: 110 }}>Reference</th>
                <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
              </tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.voucher_no || p.code}>
                    <td className="id">{p.voucher_no || p.code}</td>
                    <td className="muted">{p.paid_on ? dateFmt(p.paid_on) : '—'}</td>
                    <td>{p.work_order_code || p.description}</td>
                    <td className="muted">{p.method || '—'}</td>
                    <td className="muted">{p.reference || p.batch_ref || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--wt-green)' }}>{bdt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--wt-accent-ink)', fontWeight: 800 }}>
                  <td colSpan={5} style={{ paddingTop: 10 }}>Total received</td>
                  <td style={{ textAlign: 'right', paddingTop: 10 }}>{bdt(payouts.reduce((s, p) => s + num(p.amount), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {unpaid.length > 0 && (
        <>
          <SectionTitle count={unpaid.length} hint="Work you have done that has not yet been paid, and why.">
            Awaiting payment
          </SectionTitle>
          <div className="wt-card wt-tblcard">
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 100 }}>Job</th><th>Client</th><th style={{ width: 120 }}>Status</th><th style={{ width: 110, textAlign: 'right' }}>Owed</th></tr></thead>
              <tbody>
                {unpaid.map((w) => (
                  <tr key={w.code}>
                    <td className="id">{w.code}</td>
                    <td>{w.client_name}</td>
                    <td><Pill value={w.verified_at ? 'Verified' : w.status} sm /></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(w.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Payment is released once Seventh Sky has verified the completed work, on the terms in
            your agreement above.
          </p>
        </>
      )}
    </>
  );
}

function Compliance({ data }) {
  const c = data.compliance || {};
  const docs = c.documents || [];
  const audits = c.audits || [];

  return (
    <>
      <SectionTitle count={docs.length}
        hint="What Seventh Sky holds on file for you and when it lapses. Send a renewal before the date — lapsed cover means you cannot be assigned work.">
        Your documents
      </SectionTitle>

      {docs.length === 0 ? (
        <Nothing icon={ShieldCheck} title="Nothing on file"
          hint="Trade licence, insurance and safety certificates are held by Seventh Sky. If you have sent one and it is not here, message us." />
      ) : (
        <div className="wt-card wt-tblcard">
          <div style={{ overflowX: 'auto' }}>
            <table className="wt-tbl">
              <thead><tr>
                <th>Document</th><th style={{ width: 120 }}>Number</th>
                <th style={{ width: 130 }}>Issued by</th>
                <th style={{ width: 100 }}>Expires</th>
                <th style={{ width: 150 }}>Status</th>
              </tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.doc_type}</strong>
                      {num(d.sum_insured) > 0 && (
                        <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>
                          insured to {bdt(d.sum_insured)}
                        </span>
                      )}
                    </td>
                    <td className="muted">{d.doc_number || '—'}</td>
                    <td className="muted">{d.issuer || '—'}</td>
                    <td className="muted">{d.expiry_date ? dateFmt(d.expiry_date) : '—'}</td>
                    <td style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Pill value={d.verified ? 'Verified' : d.status} sm />
                      <ExpiryChip days={d.days_to_expiry} expired="Lapsed" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SectionTitle count={audits.length} hint="Audits Seventh Sky has carried out, and anything you were asked to put right.">
        Audits
      </SectionTitle>
      {audits.length === 0 ? (
        <Nothing icon={ClipboardCheck} title="No audits yet"
          hint="Seventh Sky audits providers annually plus on insurance, safety and service quality. Results appear here." />
      ) : audits.map((a) => (
        <Expandable key={a.code} title={`${a.audit_type} · ${a.code}`}
          subtitle={a.conducted_date ? dateFmt(a.conducted_date) : (a.scheduled_date ? `scheduled ${dateFmt(a.scheduled_date)}` : null)}
          badge={<>
            <Pill value={a.outcome} sm />
            {num(a.score) > 0 && <span className="wt-chip" style={{ cursor: 'default' }}>{a.score}/100</span>}
            {!a.closed && a.corrective_actions && <span className="wt-chip warn">action needed</span>}
          </>}
          defaultOpen={!a.closed && !!a.corrective_actions}>
          <Facts items={[
            ['Conducted', a.conducted_date ? dateFmt(a.conducted_date) : null],
            ['Score', num(a.score) > 0 ? `${a.score}/100` : null],
            ['Outcome', a.outcome],
            ['Actions due by', a.action_due_date ? dateFmt(a.action_due_date) : null],
            ['Next audit', a.next_due_date ? dateFmt(a.next_due_date) : null],
            ['Closed', a.closed ? 'Yes' : 'No'],
          ]} />
          {a.findings && <p style={{ fontSize: 13, marginTop: 10 }}><b>Findings: </b>{a.findings}</p>}
          {a.corrective_actions && (
            <div className="wt-note" style={{ marginTop: 10 }}>
              <b>What you need to put right: </b>{a.corrective_actions}
            </div>
          )}
        </Expandable>
      ))}
    </>
  );
}

function Performance({ data }) {
  const p = data.performance || {};
  const issues = data.issues || {};
  const complaints = issues.complaints || [];
  const incidents = issues.incidents || [];

  return (
    <>
      <div className="wt-kpis">
        <Kpi label="Rating" value={num(p.rating) ? `${p.rating} / 5` : '—'} tone={num(p.rating) >= 4 ? 'good' : undefined} />
        <Kpi label="Jobs completed" value={p.jobs_completed || 0} />
        <Kpi label="Completion rate" value={num(p.completion_rate) ? `${p.completion_rate}%` : '—'} />
        <Kpi label="Open issues" value={p.open_issues || 0} tone={p.open_issues ? 'bad' : 'good'} />
      </div>

      <div className="wt-card" style={{ padding: 18 }}>
        <SectionTitle hint="How Seventh Sky assesses you. Reports filed and complaints resolved both move these figures.">
          Your standing
        </SectionTitle>
        <Facts items={[
          ['Reports filed', p.reports_filed],
          ['Complaint rate', num(p.complaint_rate) ? `${p.complaint_rate}%` : '0%'],
          ['Protected clients', p.protected_clients],
          ['Rank', p.rank || null],
        ]} />
      </div>

      {/*
        * Shown deliberately. A provider whose rating is falling deserves to know
        * why, and the first they hear of a complaint against them should not be a
        * suspension. Nothing about the client's billing appears — only that they
        * were unhappy, and what about.
        */}
      <SectionTitle count={complaints.length} hint="Complaints raised about work on your jobs.">
        Complaints
      </SectionTitle>
      {complaints.length === 0 ? (
        <Nothing icon={MessageSquareWarning} title="No complaints"
          hint="Nothing has been raised about your work. This is the section to watch — it is what moves your rating." />
      ) : complaints.map((c) => (
        <Expandable key={c.code} title={`${c.incident_type} · ${c.code}`}
          subtitle={[c.logged_date ? dateFmt(c.logged_date) : null, c.client_name, c.work_order_code].filter(Boolean).join(' · ')}
          badge={<><Pill value={c.status} sm /><Pill value={c.severity} sm /></>}
          defaultOpen={!['resolved', 'closed'].includes(lower(c.status))}>
          {c.details && <p style={{ fontSize: 13, marginTop: 12 }}>{c.details}</p>}
          {c.resolution && <div className="wt-note" style={{ marginTop: 10 }}><b>Resolved: </b>{c.resolution}</div>}
        </Expandable>
      ))}

      {incidents.length > 0 && (
        <>
          <SectionTitle count={incidents.length}>Incidents on your jobs</SectionTitle>
          {incidents.map((i) => (
            <Expandable key={i.code} title={`${i.incident_type} · ${i.code}`}
              subtitle={[i.incident_date ? dateFmt(i.incident_date) : null, i.location].filter(Boolean).join(' · ')}
              badge={<><Pill value={i.status} sm /><Pill value={i.severity} sm /></>}>
              {i.description && <p style={{ fontSize: 13, marginTop: 12 }}>{i.description}</p>}
              {i.action_taken && <p style={{ fontSize: 13 }}><b>Action taken: </b>{i.action_taken}</p>}
            </Expandable>
          ))}
        </>
      )}
    </>
  );
}

/* ── the provider portal ───────────────────────────────────────────────── */

export default function PortalProvider({ data, base, reload }) {
  const [tab, setTab] = useState('overview');
  const t = data.totals || {};
  const q = data.queues || {};
  const expiring = (data.compliance?.expiring || []);
  const lapsed = expiring.filter((d) => d.days_to_expiry < 0);
  const needsYou = [...(q.awaiting_response || []), ...(q.awaiting_signature || [])];

  const tabs = [
    { value: 'overview', label: 'Overview', icon: Home, count: needsYou.length, tone: 'bad' },
    { value: 'jobs', label: 'My jobs', icon: Briefcase, count: (data.work_orders || []).length },
    { value: 'reports', label: 'My reports', icon: Camera, count: (data.reports || []).length },
    { value: 'earnings', label: 'Earnings', icon: Banknote },
    { value: 'compliance', label: 'Compliance', icon: ShieldCheck, count: expiring.length, tone: 'bad' },
    { value: 'performance', label: 'Performance', icon: TrendingUp, count: t.open_issues, tone: 'bad' },
    { value: 'messages', label: 'Messages', icon: Send },
  ];

  const alerts = [
    lapsed.length && {
      key: 'lapsed', tone: 'bad',
      title: `${lapsed.length} document${lapsed.length === 1 ? ' has' : 's have'} lapsed`,
      detail: `${lapsed.map((d) => d.doc_type).join(', ')} — you cannot be assigned work until this is renewed`,
      action: <button className="wt-btn sm" onClick={() => setTab('compliance')}>See</button>,
    },
    (expiring.length - lapsed.length) > 0 && {
      key: 'expiring', tone: 'warn',
      title: `${expiring.length - lapsed.length} document${expiring.length - lapsed.length === 1 ? '' : 's'} expiring soon`,
      detail: 'send the renewal before it lapses to avoid being stood down',
      action: <button className="wt-btn sm" onClick={() => setTab('compliance')}>See</button>,
    },
    needsYou.length && {
      key: 'jobs', tone: 'warn',
      title: `${needsYou.length} job${needsYou.length === 1 ? '' : 's'} waiting on you`,
      detail: 'accept, decline or sign so the work can be scheduled',
      action: <button className="wt-btn sm" onClick={() => setTab('overview')}>Open</button>,
    },
    t.open_issues > 0 && {
      key: 'issues', tone: 'warn',
      title: `${t.open_issues} open complaint${t.open_issues === 1 ? '' : 's'} about your work`,
      detail: 'this affects your rating and how much work you are offered',
      action: <button className="wt-btn sm" onClick={() => setTab('performance')}>Read</button>,
    },
  ];

  return (
    <>
      <Alerts items={alerts} />
      <PortalTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && <Overview data={data} base={base} reload={reload} go={setTab} />}
      {tab === 'jobs' && <Jobs data={data} base={base} reload={reload} />}
      {tab === 'reports' && <Reports data={data} />}
      {tab === 'earnings' && <Earnings data={data} />}
      {tab === 'compliance' && <Compliance data={data} />}
      {tab === 'performance' && <Performance data={data} />}
      {tab === 'messages' && <Messages data={data} base={base} reload={reload} who="you" />}
    </>
  );
}
