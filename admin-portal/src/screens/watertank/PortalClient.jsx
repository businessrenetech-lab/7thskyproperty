import React, { useState } from 'react';
import {
  Home, Wrench, FileText, Receipt, ShieldCheck, MessageSquareWarning,
  Send, Download, Check, X, Droplets, Camera, ClipboardList, Clock,
  CalendarDays, FolderOpen,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Pill, toast, errText } from './common';
import Photos from './Photos';
import {
  Kpi, Alerts, PortalTabs, Expandable, Facts, Nothing, SectionTitle,
  ExpiryChip, num, lower,
} from './portalBits';

/*
 * The customer portal.
 *
 * What it was: one scrolling page with quotations, invoices, a list of job
 * dates and a message box. What was missing was almost everything the client
 * actually relates to — the photographs taken inside their own tanks, what the
 * assessor found, the status of a complaint they had raised through this very
 * screen, what their AMC covers, which documents exist.
 *
 * The organising idea here is that a client asks four kinds of question and the
 * portal should answer each without a telephone call:
 *
 *   "What is happening?"      → Overview, Jobs
 *   "What did you find?"      → Reports, with the before and after photographs
 *   "What do I owe?"          → Invoices, with receipts they can reconcile
 *   "Something is wrong."     → Complaints, WITH the status of the last one
 *
 * The fourth was the sharpest gap: raising a complaint here worked, and then
 * vanished. A button that appears to do nothing is worse than no button.
 */

const isOverdue = (i) => num(i.outstanding) > 0 && i.due_date && new Date(i.due_date) < new Date();

/* ── overview ──────────────────────────────────────────────────────────── */

function Overview({ data, go }) {
  const t = data.totals || {};
  const overdue = (data.invoices || []).filter(isOverdue);
  const pending = (data.quotations || []).filter((q) => ['pending', 'sent'].includes(lower(q.decision)));
  const nextVisit = (data.amc || [])
    .flatMap((a) => (a.visits || []).map((v) => ({ ...v, amc: a.code })))
    .filter((v) => !['completed', 'cancelled'].includes(lower(v.status)) && v.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];

  return (
    <>
      <div className="wt-kpis">
        <Kpi label="Outstanding" value={bdt(t.outstanding)} tone={t.outstanding > 0 ? 'bad' : 'good'}
          sub={t.outstanding > 0 ? `${t.invoices} invoice${t.invoices === 1 ? '' : 's'} on file` : 'nothing owing'}
          onClick={() => go('invoices')} />
        <Kpi label="Quotations to review" value={pending.length} tone={pending.length ? 'warn' : undefined}
          sub={pending.length ? 'waiting on your decision' : 'none waiting'} onClick={() => go('quotations')} />
        <Kpi label="Service reports" value={t.reports || 0} sub="with photographs"
          onClick={() => go('reports')} />
        <Kpi label="Active warranties" value={t.active_warranties || 0}
          tone={t.expiring_warranties ? 'warn' : undefined}
          sub={t.expiring_warranties ? `${t.expiring_warranties} expiring soon` : 'cover on completed work'}
          onClick={() => go('amc')} />
      </div>

      {/* What is happening next, in one line, because that is the question. */}
      {(nextVisit || (data.work_orders || []).some((w) => w.scheduled_date && !w.completed_at)) && (
        <div className="wt-card" style={{ padding: 16 }}>
          <SectionTitle>What happens next</SectionTitle>
          {nextVisit && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, fontSize: 13.5 }}>
              <CalendarDays size={16} style={{ color: 'var(--wt-accent)' }} />
              <span>
                <b>{nextVisit.visit_type || 'AMC visit'}</b> due {dateFmt(nextVisit.due_date)}
                {nextVisit.scheduled_date ? ` · booked for ${dateFmt(nextVisit.scheduled_date)}` : ' · not yet booked'}
              </span>
            </div>
          )}
          {(data.work_orders || []).filter((w) => w.scheduled_date && !w.completed_at).slice(0, 3).map((w) => (
            <div key={w.code} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, fontSize: 13.5 }}>
              <Wrench size={16} style={{ color: 'var(--wt-accent)' }} />
              <span>
                <b>{w.category || 'Service visit'}</b> booked for {dateFmt(w.scheduled_date)}
                {w.provider_name ? ` · ${w.provider_name}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="wt-card" style={{ padding: 16 }}>
          <SectionTitle count={overdue.length}>Invoices past their due date</SectionTitle>
          {overdue.map((i) => (
            <div key={i.code} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--wt-line)', fontSize: 13 }}>
              <span>{i.code} · due {dateFmt(i.due_date)}</span>
              <b style={{ color: 'var(--wt-red)' }}>{bdt(i.outstanding)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── property ──────────────────────────────────────────────────────────── */

function Property({ data }) {
  const p = data.property || {};
  const assessments = data.assessments || [];

  return (
    <>
      <div className="wt-card" style={{ padding: 18 }}>
        <SectionTitle hint="What Seventh Sky holds on record for your property. If any of this is wrong, send a message and it will be corrected.">
          Your property
        </SectionTitle>
        <Facts items={[
          ['Address', p.service_address],
          ['Area', p.district],
          ['Property type', p.property_type],
          ['Number of tanks', p.tanks_count || null],
          ['Tank type', p.tank_type],
          ['Capacity', p.tank_capacity],
          ['Last cleaned', p.last_cleaning],
          ['AMC package', p.amc_package],
        ]} />
      </div>

      <SectionTitle count={assessments.length}
        hint="What the assessor found when they surveyed your tanks — the condition, the risks and the photographs.">
        Site assessments
      </SectionTitle>

      {assessments.length === 0 ? (
        <Nothing icon={Droplets} title="No assessment on file yet"
          hint="A site assessment is the survey Seventh Sky carries out before quoting. Once one is done, its findings and photographs appear here." />
      ) : assessments.map((a) => (
        <Expandable key={a.code} title={a.code}
          subtitle={`${a.assessed_date ? dateFmt(a.assessed_date) : 'date not recorded'}${a.assessor ? ` · ${a.assessor}` : ''}`}
          badge={<Pill value={a.status} sm />}>
          <Facts items={[
            ['Tank type', a.tank_type],
            ['Capacity', a.tank_capacity],
            ['Material', a.tank_material],
            ['Location', a.tank_location],
            ['Water source', a.water_source],
            ['Last cleaned', a.last_cleaned],
            ['Contamination', a.contamination],
            ['Leakage', a.leakage],
            ['Safe access', a.access_safe ? 'Yes' : 'No — noted'],
          ]} />

          {a.findings && (
            <>
              <SectionTitle>What was found</SectionTitle>
              <p style={{ fontSize: 13, marginTop: 6 }}>{a.findings}</p>
            </>
          )}
          {a.structural_notes && (
            <p style={{ fontSize: 13 }}><b>Structural notes: </b>{a.structural_notes}</p>
          )}

          {(a.risks || []).length > 0 && (
            <>
              <SectionTitle>Risks noted</SectionTitle>
              <ul style={{ fontSize: 13, marginTop: 6, paddingLeft: 18 }}>
                {a.risks.map((r, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i}>{typeof r === 'string' ? r : (r.risk || r.name || JSON.stringify(r))}</li>
                ))}
              </ul>
            </>
          )}

          {(a.recommended_services || []).length > 0 && (
            <>
              <SectionTitle>Recommended</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {a.recommended_services.map((s, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={i} className="wt-chip" style={{ cursor: 'default' }}>
                    {typeof s === 'string' ? s : (s.name || s.service || '—')}
                  </span>
                ))}
              </div>
            </>
          )}

          {(a.photos || []).length > 0 && <Photos key={`${a.code}-b`} readOnly label="Photographs" photos={a.photos} />}
          {(a.photos_after || []).length > 0 && <Photos key={`${a.code}-a`} readOnly label="After" photos={a.photos_after} />}
        </Expandable>
      ))}
    </>
  );
}

/* ── jobs ──────────────────────────────────────────────────────────────── */

function Jobs({ data }) {
  const jobs = data.work_orders || [];
  const projects = data.projects || [];

  return (
    <>
      {projects.length > 0 && (
        <>
          <SectionTitle count={projects.length} hint="Larger pieces of work, and how far along they are.">Projects</SectionTitle>
          {projects.map((p) => (
            <div key={p.code} className="wt-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <FolderOpen size={15} style={{ color: 'var(--wt-accent)' }} />
                <strong>{p.name || p.code}</strong>
                <Pill value={p.status} sm />
                <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>{p.stage}</span>
              </div>
              <div style={{ marginTop: 10, height: 7, borderRadius: 999, background: 'var(--wt-line)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, num(p.progress))}%`, height: '100%', background: 'var(--wt-accent)' }} />
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{Math.min(100, num(p.progress))}% complete</div>
            </div>
          ))}
        </>
      )}

      <SectionTitle count={jobs.length}>Service history</SectionTitle>
      {jobs.length === 0 ? (
        <Nothing icon={Wrench} title="No jobs yet"
          hint="Once Seventh Sky raises a work order for your property it appears here with its dates and the team attending." />
      ) : jobs.map((w) => (
        <Expandable key={w.code} title={`${w.category || 'Service'} · ${w.code}`}
          subtitle={[w.provider_name, w.site_address].filter(Boolean).join(' · ')}
          badge={<Pill value={w.status} sm />}
          right={w.completed_at ? <span className="muted" style={{ fontSize: 12 }}>{dateFmt(w.completed_at)}</span> : null}>
          {w.scope && <p style={{ fontSize: 13, marginTop: 12 }}>{w.scope}</p>}
          <Facts items={[
            ['Target date', w.target_date ? dateFmt(w.target_date) : null],
            ['Booked for', w.scheduled_date ? dateFmt(w.scheduled_date) : null],
            ['Completed', w.completed_at ? dateFmt(w.completed_at) : null],
            ['Signed off by Seventh Sky', w.verified_at ? dateFmt(w.verified_at) : 'not yet'],
          ]} />
          {w.completion_notes && (
            <p style={{ fontSize: 13, marginTop: 10 }}><b>Notes on completion: </b>{w.completion_notes}</p>
          )}
        </Expandable>
      ))}
    </>
  );
}

/* ── reports ───────────────────────────────────────────────────────────── */

function Reports({ data }) {
  const reports = data.reports || [];
  return (
    <>
      <SectionTitle count={reports.length}
        hint="What the team did at your property and what they photographed, filed after each visit.">
        Service reports
      </SectionTitle>

      {reports.length === 0 ? (
        <Nothing icon={Camera} title="No reports yet"
          hint="After each visit the team files a report with before and after photographs of your tanks. They appear here as soon as they are submitted." />
      ) : reports.map((r) => (
        <Expandable key={r.code} title={`${r.report_type} · ${r.code}`}
          subtitle={[r.submitted_date ? dateFmt(r.submitted_date) : null, r.provider_name, r.work_order_code]
            .filter(Boolean).join(' · ')}
          badge={(r.photos_before?.length || r.photos_after?.length)
            ? <span className="wt-chip" style={{ cursor: 'default' }}>
              <Camera size={11} style={{ verticalAlign: -1 }} /> {(r.photos_before?.length || 0) + (r.photos_after?.length || 0)}
            </span> : null}>
          {r.summary && (
            <>
              <SectionTitle>What was done</SectionTitle>
              <p style={{ fontSize: 13, marginTop: 6 }}>{r.summary}</p>
            </>
          )}
          {r.findings && (
            <>
              <SectionTitle>Findings</SectionTitle>
              <p style={{ fontSize: 13, marginTop: 6 }}>{r.findings}</p>
            </>
          )}
          {(r.photos_before || []).length > 0 && <Photos key={`${r.code}-b`} readOnly label="Before" photos={r.photos_before} />}
          {(r.photos_after || []).length > 0 && <Photos key={`${r.code}-a`} readOnly label="After" photos={r.photos_after} />}
        </Expandable>
      ))}
    </>
  );
}

/* ── quotations ────────────────────────────────────────────────────────── */

function Quotations({ data, base, reload }) {
  const [busy, setBusy] = useState('');
  const quotes = data.quotations || [];

  const decide = async (q, decision) => {
    setBusy(q.code);
    try {
      const r = await api.post(`${base}/quotations/${q.code}/decision`, { decision });
      toast.ok(r.data.message);
      reload();
    } catch (e) { toast.err(errText(e, 'Could not record that')); }
    finally { setBusy(''); }
  };

  return (
    <>
      <SectionTitle count={quotes.length} hint="Accepting a quotation here is your decision and is recorded as such.">
        Quotations
      </SectionTitle>
      {quotes.length === 0 ? (
        <Nothing icon={FileText} title="No quotations"
          hint="When Seventh Sky prices a piece of work for you it appears here for you to accept or decline." />
      ) : quotes.map((q) => {
        const open = ['pending', 'sent'].includes(lower(q.decision));
        return (
          <Expandable key={q.code} title={q.code} defaultOpen={open}
            subtitle={q.validity ? `Valid ${q.validity}` : null}
            badge={<Pill value={q.decision} sm />}
            right={<b style={{ fontSize: 15 }}>{bdt(q.total)}</b>}>
            <table className="wt-tbl" style={{ marginTop: 12 }}>
              <thead><tr><th>Item</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 110, textAlign: 'right' }}>Price</th></tr></thead>
              <tbody>
                {(q.lines || []).map((l, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td>{l.name}</td>
                    <td className="muted">{l.qty} {l.unit || ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{bdt(l.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Facts items={[
              ['Service charges', q.service_charges ? bdt(q.service_charges) : null],
              ['VAT', q.vat ? bdt(q.vat) : null],
              ['Total', bdt(q.total)],
            ]} />
            {open && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button className="wt-btn primary" disabled={busy === q.code} onClick={() => decide(q, 'Approved')}>
                  <Check size={14} /> Accept this quotation
                </button>
                <button className="wt-btn" disabled={busy === q.code} onClick={() => decide(q, 'Rejected')}>
                  <X size={14} /> Decline
                </button>
              </div>
            )}
          </Expandable>
        );
      })}
    </>
  );
}

/* ── invoices ──────────────────────────────────────────────────────────── */

function Invoices({ data, base }) {
  const invoices = data.invoices || [];
  const openPdf = (inv) => {
    const root = api.defaults.baseURL || '';
    window.open(`${root}${base}/invoices/${inv.code}/pdf`, '_blank');
  };

  return (
    <>
      <SectionTitle count={invoices.length}
        hint="Every invoice, what has been received against it and what is still owed. Receipts are listed so you can reconcile without asking.">
        Invoices &amp; receipts
      </SectionTitle>

      {invoices.length === 0 ? (
        <Nothing icon={Receipt} title="No invoices" hint="Invoices appear here as soon as they are issued." />
      ) : invoices.map((i) => (
        <Expandable key={i.code} title={`${i.code}${i.inv_type ? ` · ${i.inv_type}` : ''}`}
          subtitle={[i.issue_date ? `Issued ${dateFmt(i.issue_date)}` : null, i.due_date ? `due ${dateFmt(i.due_date)}` : null]
            .filter(Boolean).join(' · ')}
          badge={<>
            <Pill value={i.status} sm />
            {isOverdue(i) && <span className="wt-chip warn"><Clock size={11} style={{ verticalAlign: -1 }} /> past due</span>}
          </>}
          right={<span style={{ textAlign: 'right' }}>
            <b style={{ fontSize: 15, display: 'block' }}>{bdt(i.amount)}</b>
            {num(i.outstanding) > 0 && <span style={{ fontSize: 11.5, color: 'var(--wt-red)' }}>{bdt(i.outstanding)} owing</span>}
          </span>}>
          <table className="wt-tbl" style={{ marginTop: 12 }}>
            <thead><tr><th>Item</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 110, textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {(i.lines || []).map((l, n) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={n}>
                  <td>{l.name}{l.description ? <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{l.description}</span> : null}</td>
                  <td className="muted">{l.qty} {l.unit || ''}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{bdt(l.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Facts items={[
            ['Discount', num(i.discount) ? `− ${bdt(i.discount)}` : null],
            ['VAT', num(i.vat_amount) ? bdt(i.vat_amount) : null],
            ['Advance applied', num(i.advance_applied) ? `− ${bdt(i.advance_applied)}` : null],
            ['Total', bdt(i.amount)],
            ['Received', bdt(i.paid_amount)],
            ['Still owing', bdt(i.outstanding)],
            ['Terms', i.payment_terms],
          ]} />

          {(i.receipts || []).length > 0 && (
            <>
              <SectionTitle count={i.receipts.length}>Payments received</SectionTitle>
              {i.receipts.map((r, n) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--wt-line)', fontSize: 13 }}>
                  <span className="muted">
                    {r.received_on ? dateFmt(r.received_on) : '—'}
                    {r.method ? ` · ${r.method}` : ''}{r.reference ? ` · ${r.reference}` : ''}
                  </span>
                  <b style={{ color: 'var(--wt-green)' }}>{bdt(r.amount)}</b>
                </div>
              ))}
            </>
          )}

          <button className="wt-btn" style={{ marginTop: 14 }} onClick={() => openPdf(i)}>
            <Download size={14} /> Download this invoice
          </button>
        </Expandable>
      ))}
    </>
  );
}

/* ── AMC & warranty ────────────────────────────────────────────────────── */

function Care({ data }) {
  const amcs = data.amc || [];
  const warranties = data.warranties || [];

  return (
    <>
      <SectionTitle count={amcs.length} hint="Your maintenance contract and every visit it entitles you to.">
        Maintenance contracts
      </SectionTitle>
      {amcs.length === 0 ? (
        <Nothing icon={ShieldCheck} title="No maintenance contract"
          hint="An AMC schedules regular cleaning and testing so tanks are not left until there is a problem. Ask Seventh Sky if you would like one quoted." />
      ) : amcs.map((a) => (
        <Expandable key={a.code} title={`${a.package || 'AMC'} · ${a.code}`} defaultOpen
          subtitle={[a.frequency, a.start_date ? `from ${dateFmt(a.start_date)}` : null, a.end_date ? `to ${dateFmt(a.end_date)}` : null]
            .filter(Boolean).join(' · ')}
          badge={<Pill value={a.status} sm />}
          right={<b>{bdt(a.contract_value)}</b>}>
          {(a.visits || []).length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>No visits scheduled yet.</p>
          ) : (
            <table className="wt-tbl" style={{ marginTop: 12 }}>
              <thead><tr>
                <th style={{ width: 46 }}>#</th><th>Visit</th>
                <th style={{ width: 96 }}>Due</th><th style={{ width: 96 }}>Booked</th>
                <th style={{ width: 96 }}>Done</th><th style={{ width: 104 }}>Status</th>
              </tr></thead>
              <tbody>
                {a.visits.map((v) => (
                  <tr key={`${a.code}-${v.visit_no}`}>
                    <td className="muted">{v.visit_no}</td>
                    <td>{v.visit_type || 'Service visit'}
                      {v.findings ? <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{v.findings}</span> : null}</td>
                    <td className="muted">{v.due_date ? dateFmt(v.due_date) : '—'}</td>
                    <td className="muted">{v.scheduled_date ? dateFmt(v.scheduled_date) : '—'}</td>
                    <td className="muted">{v.completed_date ? dateFmt(v.completed_date) : '—'}</td>
                    <td><Pill value={v.status} sm /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Expandable>
      ))}

      <SectionTitle count={warranties.length} hint="Cover given on work already completed.">Warranties</SectionTitle>
      {warranties.length === 0 ? (
        <Nothing icon={ShieldCheck} title="No warranties on file"
          hint="Cover registered against completed work appears here with what it includes and when it lapses." />
      ) : warranties.map((w) => (
        <Expandable key={w.code} title={`${w.warranty_type} · ${w.code}`}
          subtitle={`${w.start_date ? dateFmt(w.start_date) : '—'} to ${w.expiry_date ? dateFmt(w.expiry_date) : '—'}`}
          badge={<><Pill value={w.status} sm /><ExpiryChip days={w.days_to_expiry} expired="Lapsed" /></>}>
          <Facts items={[
            ['Against job', w.work_order_code],
            ['Cover starts', w.start_date ? dateFmt(w.start_date) : null],
            ['Cover ends', w.expiry_date ? dateFmt(w.expiry_date) : null],
          ]} />
          {w.coverage && <p style={{ fontSize: 13, marginTop: 10 }}><b>What is covered: </b>{w.coverage}</p>}
          {w.terms && <p className="muted" style={{ fontSize: 12.5 }}><b>Conditions: </b>{w.terms}</p>}
        </Expandable>
      ))}
    </>
  );
}

/* ── requests & complaints ─────────────────────────────────────────────── */

const COMPLAINT_ABOUT = [
  'Service Quality', 'Water Discolouration', 'Incomplete Work', 'Damage During Service',
  'Staff Conduct', 'Late Attendance', 'Billing Dispute', 'Repeat Fault', 'Other',
];

function Issues({ data, base, reload }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ work_order_code: '', incident_type: COMPLAINT_ABOUT[0], severity: 'Medium', details: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const complaints = data.complaints || [];
  const requests = data.requests || [];

  const send = async () => {
    if (!f.details.trim()) return;
    setBusy(true);
    try {
      const r = await api.post(`${base}/complaint`, f);
      toast.ok(r.data.message);
      setF({ work_order_code: '', incident_type: COMPLAINT_ABOUT[0], severity: 'Medium', details: '' });
      setOpen(false);
      // Reload so the new complaint appears BELOW immediately. Raising one and
      // seeing nothing change is what made the old button feel broken.
      reload();
    } catch (e) { toast.err(errText(e, 'Could not log that')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="wt-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SectionTitle>Something wrong?</SectionTitle>
          <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={() => setOpen((v) => !v)}>
            {open ? 'Never mind' : 'Raise a complaint'}
          </button>
        </div>
        {!open ? (
          <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
            A complaint is logged formally and acknowledged within one business day. Unlike a
            message it is tracked until resolved, and you can follow it below.
          </p>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.work_orders || []).length > 0 && (
              <div className="wt-field">
                <label>Which job is this about?</label>
                <select className="wt-select" value={f.work_order_code} onChange={(e) => set('work_order_code', e.target.value)}>
                  <option value="">Not about a specific job</option>
                  {data.work_orders.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code}{w.category ? ` — ${w.category}` : ''}{w.scheduled_date ? ` (${dateFmt(w.scheduled_date)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="wt-grid2">
              <div className="wt-field">
                <label>What is it about?</label>
                <select className="wt-select" value={f.incident_type} onChange={(e) => set('incident_type', e.target.value)}>
                  {COMPLAINT_ABOUT.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="wt-field">
                <label>How serious is it?</label>
                <select className="wt-select" value={f.severity} onChange={(e) => set('severity', e.target.value)}>
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
              </div>
            </div>
            <div className="wt-field">
              <label>What happened</label>
              <textarea className="wt-input" rows={4} value={f.details} onChange={(e) => set('details', e.target.value)}
                placeholder="Tell us what went wrong and what you would like us to do." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="wt-btn primary" disabled={busy || !f.details.trim()} onClick={send}>
                <Send size={14} /> {busy ? 'Logging…' : 'Log complaint'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* The half that was missing: what happened to the ones already raised. */}
      <SectionTitle count={complaints.length}>Your complaints</SectionTitle>
      {complaints.length === 0 ? (
        <Nothing icon={MessageSquareWarning} title="Nothing raised"
          hint="Any complaint you log — or that Seventh Sky logs on your behalf — appears here with its status until it is resolved." />
      ) : complaints.map((c) => (
        <Expandable key={c.code} title={`${c.incident_type} · ${c.code}`}
          subtitle={[c.logged_date ? dateFmt(c.logged_date) : null, c.work_order_code].filter(Boolean).join(' · ')}
          badge={<>
            <Pill value={c.status} sm />
            <Pill value={c.severity} sm />
            {c.raised_via === 'client' && <span className="wt-chip" style={{ cursor: 'default' }}>raised by you</span>}
          </>}
          defaultOpen={!['resolved', 'closed'].includes(lower(c.status))}>
          {c.details && <p style={{ fontSize: 13, marginTop: 12 }}>{c.details}</p>}
          <Facts items={[
            ['Logged', c.logged_date ? dateFmt(c.logged_date) : null],
            ['Acknowledged', c.acknowledged_at ? dateFmt(c.acknowledged_at) : 'not yet'],
            ['Response due within', c.sla_due],
            ['Resolved', c.resolved_date ? dateFmt(c.resolved_date) : null],
          ]} />
          {c.resolution && (
            <div className="wt-note" style={{ marginTop: 10 }}>
              <b>How it was resolved: </b>{c.resolution}
            </div>
          )}
        </Expandable>
      ))}

      {requests.length > 0 && (
        <>
          <SectionTitle count={requests.length} hint="Service you have asked for that has not yet become a booked job.">
            Your requests
          </SectionTitle>
          {requests.map((r) => (
            <Expandable key={r.code} title={`${r.specific_service || r.category || 'Service request'} · ${r.code}`}
              subtitle={r.request_date ? dateFmt(r.request_date) : null}
              badge={<><Pill value={r.status} sm />{r.priority ? <Pill value={r.priority} sm /> : null}</>}>
              <Facts items={[
                ['Service', r.specific_service || r.category],
                ['Preferred date', r.preferred_date ? dateFmt(r.preferred_date) : null],
                ['Priority', r.priority],
              ]} />
              {r.description && <p style={{ fontSize: 13, marginTop: 10 }}>{r.description}</p>}
            </Expandable>
          ))}
        </>
      )}
    </>
  );
}

/* ── messages ──────────────────────────────────────────────────────────── */

export function Messages({ data, base, reload, who }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const messages = data.messages || [];

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await api.post(`${base}/message`, { body });
      toast.ok(r.data.message);
      setBody('');
      // So the sender sees their own message land, rather than writing into
      // silence and wondering whether it went anywhere.
      reload();
    } catch (e) { toast.err(errText(e, 'Could not send that')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="wt-card" style={{ padding: 18 }}>
        <SectionTitle>Message Seventh Sky</SectionTitle>
        <textarea className="wt-input" rows={3} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Anything you need to tell us…" style={{ marginTop: 10 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 9 }}>
          <button className="wt-btn primary" disabled={busy || !body.trim()} onClick={send}>
            <Send size={14} /> {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      <SectionTitle count={messages.length}>History</SectionTitle>
      {messages.length === 0 ? (
        <Nothing icon={ClipboardList} title="Nothing yet"
          hint={`Messages between ${who} and Seventh Sky appear here, so nothing is lost between a call and an email.`} />
      ) : (
        <div className="wt-card" style={{ padding: 18 }}>
          {messages.map((m, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} style={{
              padding: '10px 0', borderBottom: i === messages.length - 1 ? 0 : '1px solid var(--wt-line)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="wt-chip" style={{ cursor: 'default' }}>
                  {m.direction === 'inbound' ? 'You' : 'Seventh Sky'}
                </span>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  {m.logged_at ? dateFmt(m.logged_at) : ''}{m.channel ? ` · ${m.channel}` : ''}
                  {m.ref_code ? ` · ${m.ref_code}` : ''}
                </span>
              </div>
              <p style={{ fontSize: 13, margin: '6px 0 0' }}>{m.summary}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── the client portal ─────────────────────────────────────────────────── */

export default function PortalClient({ data, base, reload }) {
  const [tab, setTab] = useState('overview');
  const t = data.totals || {};
  const overdue = (data.invoices || []).filter(isOverdue);

  const tabs = [
    { value: 'overview', label: 'Overview', icon: Home },
    { value: 'property', label: 'My property', icon: Droplets, count: (data.assessments || []).length },
    { value: 'jobs', label: 'Jobs', icon: Wrench, count: (data.work_orders || []).length },
    { value: 'reports', label: 'Reports & photos', icon: Camera, count: (data.reports || []).length },
    { value: 'quotations', label: 'Quotations', icon: FileText, count: t.open_quotations, tone: 'bad' },
    { value: 'invoices', label: 'Invoices', icon: Receipt, count: overdue.length, tone: 'bad' },
    { value: 'amc', label: 'AMC & warranty', icon: ShieldCheck, count: (data.amc || []).length },
    { value: 'issues', label: 'Requests & complaints', icon: MessageSquareWarning, count: t.open_complaints, tone: 'bad' },
    { value: 'messages', label: 'Messages', icon: Send },
  ];

  const alerts = [
    overdue.length && {
      key: 'overdue', tone: 'bad',
      title: `${overdue.length} invoice${overdue.length === 1 ? ' is' : 's are'} past due`,
      detail: `${bdt(overdue.reduce((s, i) => s + num(i.outstanding), 0))} outstanding`,
      action: <button className="wt-btn sm" onClick={() => setTab('invoices')}>View</button>,
    },
    t.open_quotations > 0 && {
      key: 'quotes', tone: 'warn',
      title: `${t.open_quotations} quotation${t.open_quotations === 1 ? '' : 's'} waiting on you`,
      detail: 'work cannot be scheduled until it is accepted',
      action: <button className="wt-btn sm" onClick={() => setTab('quotations')}>Review</button>,
    },
    t.expiring_warranties > 0 && {
      key: 'warranty', tone: 'warn',
      title: `${t.expiring_warranties} warrant${t.expiring_warranties === 1 ? 'y expires' : 'ies expire'} within 60 days`,
      detail: 'ask about renewing before cover lapses',
      action: <button className="wt-btn sm" onClick={() => setTab('amc')}>See cover</button>,
    },
  ];

  return (
    <>
      <Alerts items={alerts} />
      <PortalTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && <Overview data={data} go={setTab} />}
      {tab === 'property' && <Property data={data} />}
      {tab === 'jobs' && <Jobs data={data} />}
      {tab === 'reports' && <Reports data={data} />}
      {tab === 'quotations' && <Quotations data={data} base={base} reload={reload} />}
      {tab === 'invoices' && <Invoices data={data} base={base} />}
      {tab === 'amc' && <Care data={data} />}
      {tab === 'issues' && <Issues data={data} base={base} reload={reload} />}
      {tab === 'messages' && <Messages data={data} base={base} reload={reload} who="you" />}
    </>
  );
}
