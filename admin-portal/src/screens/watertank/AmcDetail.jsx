import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw, Shield, CalendarClock, Receipt, RotateCcw, Pencil, ArrowLeft,
  CheckCircle2, AlertTriangle, User, MapPin,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav,
  WtHead, WtTabs, Pill, bdt, dateFmt, Loading, EmptyState, toast, errText, titleCase, WtDrawer, svcBase,
} from './common';

/*
 * AMC contract dossier — the detail page the AMC register never had.
 *
 * Everything about a contract was previously reachable only through a drawer on
 * the register, which meant it could not be linked to: no way to send a
 * colleague "look at WTCM-A0007", no back button, no bookmark. A contract that
 * runs for a year and carries a visit plan, a billing schedule and a renewal
 * date deserves a page.
 *
 * Reads /wt-amc/:code, which already returns the whole dossier — contract,
 * client, visit plan, derived billing and the invoices raised against it.
 */

const num = (v) => Number(v || 0);

const VISIT_STATUSES = ['Planned', 'Scheduled', 'Completed', 'Missed', 'Cancelled'];

function VisitDrawer({ amcCode, visit, onClose, onSaved }) {
  const [f, setF] = useState({
    status: visit.status || 'Planned',
    scheduled_date: visit.scheduled_date || '',
    completed_date: visit.completed_date || '',
    findings: visit.findings || '',
    water_test_result: visit.water_test_result || '',
    satisfaction_score: visit.satisfaction_score || '',
    notes: visit.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.patch(`/wt-amc/${amcCode}/visits/${visit.id}`, {
        ...f,
        satisfaction_score: f.satisfaction_score === '' ? null : Number(f.satisfaction_score),
        scheduled_date: f.scheduled_date || null,
        completed_date: f.completed_date || null,
      });
      toast.ok(`Visit ${visit.visit_no} updated.`);
      onSaved();
    } catch (e) { setErr(errText(e, 'Could not update this visit')); setBusy(false); }
  };

  return (
    <WtDrawer title={`Visit ${visit.visit_no} — ${visit.visit_type}`}
      subtitle={visit.due_date ? `Due ${dateFmt(visit.due_date)}` : undefined}
      onClose={onClose}
      footer={<>
        <button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-field">
        <label>Status</label>
        <select className="wt-select" value={f.status} onChange={set('status')}>
          {VISIT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Scheduled</label>
          <input className="wt-input" type="date" value={f.scheduled_date} onChange={set('scheduled_date')} />
        </div>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Completed</label>
          <input className="wt-input" type="date" value={f.completed_date} onChange={set('completed_date')} />
        </div>
      </div>
      <div className="wt-field">
        <label>Findings</label>
        <textarea className="wt-input" rows={3} value={f.findings} onChange={set('findings')} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Water test result</label>
          <input className="wt-input" value={f.water_test_result} onChange={set('water_test_result')} />
        </div>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Satisfaction (1–5)</label>
          <input className="wt-input" type="number" min={1} max={5}
            value={f.satisfaction_score} onChange={set('satisfaction_score')} />
        </div>
      </div>
      <div className="wt-field">
        <label>Notes</label>
        <textarea className="wt-input" rows={2} value={f.notes} onChange={set('notes')} />
      </div>
    </WtDrawer>
  );
}

/*
 * Editing a live contract.
 *
 * Deliberately NOT the create wizard: that builds a contract from a package and
 * regenerates the visit plan, which is the wrong thing to do to a contract that
 * is already running and has visits recorded against it. What actually changes
 * mid-term is the status, the dates, the money and the renewal intent — so
 * that is what this edits, through PATCH /wt-amc/:code.
 */
const AMC_STATUSES = ['Draft', 'Active', 'Suspended', 'Expired', 'Cancelled', 'Renewed'];

function EditDrawer({ amc, onClose, onSaved }) {
  const [f, setF] = useState({
    status: amc.status || 'Active',
    start_date: amc.start_date || '',
    end_date: amc.end_date || '',
    annual_value: amc.annual_value ?? '',
    discount: amc.discount ?? '',
    payment_terms: amc.payment_terms || '',
    auto_renew: amc.auto_renew ? '1' : '0',
    renewal_notice_days: amc.renewal_notice_days ?? '',
    assigned_officer: amc.assigned_officer || '',
    notes: amc.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.patch(`/wt-amc/${amc.code}`, {
        ...f,
        annual_value: f.annual_value === '' ? null : Number(f.annual_value),
        discount: f.discount === '' ? null : Number(f.discount),
        renewal_notice_days: f.renewal_notice_days === '' ? null : Number(f.renewal_notice_days),
        auto_renew: f.auto_renew === '1',
        start_date: f.start_date || null,
        end_date: f.end_date || null,
      });
      toast.ok(`${amc.code} updated.`);
      onSaved();
    } catch (e) { setErr(errText(e, 'Could not save this contract')); setBusy(false); }
  };

  return (
    <WtDrawer title={`Edit ${amc.code}`} subtitle={amc.client_name} onClose={onClose}
      footer={<>
        <button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-note">
        Package, visit mix and the generated visit plan are set when the contract is
        created — changing them mid-term would rewrite work already delivered. Raise a
        renewal instead.
      </div>

      <div className="wt-field">
        <label>Status</label>
        <select className="wt-select" value={f.status} onChange={set('status')}>
          {AMC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Start</label>
          <input className="wt-input" type="date" value={f.start_date} onChange={set('start_date')} />
        </div>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>End</label>
          <input className="wt-input" type="date" value={f.end_date} onChange={set('end_date')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Annual value</label>
          <input className="wt-input" type="number" value={f.annual_value} onChange={set('annual_value')} />
        </div>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Discount</label>
          <input className="wt-input" type="number" value={f.discount} onChange={set('discount')} />
        </div>
      </div>
      <div className="wt-field">
        <label>Payment terms</label>
        <input className="wt-input" value={f.payment_terms} onChange={set('payment_terms')} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Auto renew</label>
          <select className="wt-select" value={f.auto_renew} onChange={set('auto_renew')}>
            <option value="1">Yes</option><option value="0">No</option>
          </select>
        </div>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Renewal notice (days)</label>
          <input className="wt-input" type="number" value={f.renewal_notice_days} onChange={set('renewal_notice_days')} />
        </div>
      </div>
      <div className="wt-field">
        <label>Assigned officer</label>
        <input className="wt-input" value={f.assigned_officer} onChange={set('assigned_officer')} />
      </div>
      <div className="wt-field">
        <label>Notes</label>
        <textarea className="wt-input" rows={3} value={f.notes} onChange={set('notes')} />
      </div>
    </WtDrawer>
  );
}

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--wt-line)' }}>
    <span className="muted" style={{ fontSize: 12 }}>{label}</span>
    <span style={{ fontSize: 13, textAlign: 'right' }}>{children ?? '—'}</span>
  </div>
);

export default function AmcDetail() {
  const { code } = useParams();
  const nav = useSvcNav();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Visit plan');
  const [visit, setVisit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-amc/${code}`)
      .then((r) => setD(r.data))
      .catch((e) => { setD(null); setError(errText(e, 'Could not load this contract')); })
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const renew = async () => {
    setRenewing(true);
    try {
      const r = await api.post(`/wt-amc/${code}/renew`, {});
      /*
       * The endpoint returns `amc` = the contract that was just superseded and
       * `renewed` = the new one. Following `amc` would leave the operator staring
       * at the expired term wondering whether anything happened.
       */
      const next = r.data?.renewed;
      if (next?.code) {
        toast.ok(`Renewed — ${next.code} runs from ${dateFmt(next.start_date)}.`);
        nav(`/water-tank/amc/${next.code}`);
      } else {
        toast.ok('Renewal decision recorded.');
        load();
      }
    } catch (e) { toast.err(errText(e, 'Could not renew this contract')); }
    finally { setRenewing(false); }
  };

  if (loading) return (<><WtHead title="AMC contract" subtitle={code} /><Loading /></>);

  if (error || !d) return (
    <>
      <WtHead title="AMC contract" subtitle={code} />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load this contract" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  const { amc, client, visits = [], stats = {}, billing = {}, invoices = [] } = d;
  const amcInvoices = invoices.filter((i) => i.amc_code === amc.code);

  const counts = {
    'Visit plan': visits.length,
    Billing: amcInvoices.length,
    Contract: null,
  };

  return (
    <>
      <WtHead title={`${amc.code} — ${amc.package || 'Annual Maintenance Contract'}`}
        subtitle={amc.client_name}
        crumb={<Link to={`${svcBase()}/amc`}><ArrowLeft size={13} /> All AMC contracts</Link>}>
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
        {(stats.renewal_due || stats.expired) && (
          <button className="wt-btn primary" disabled={renewing} onClick={renew}>
            <RotateCcw size={14} /> {renewing ? 'Renewing…' : 'Renew'}
          </button>
        )}
      </WtHead>

      {/* The two things that actually decide what to do with a contract today. */}
      {stats.expired && (
        <div className="wt-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center', borderLeft: '3px solid var(--wt-red)' }}>
          <AlertTriangle size={17} style={{ color: 'var(--wt-red)' }} />
          <span>This contract expired on <b>{dateFmt(amc.end_date)}</b>. Cover has lapsed.</span>
        </div>
      )}
      {!stats.expired && stats.renewal_due && (
        <div className="wt-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center', borderLeft: '3px solid #b45309' }}>
          <CalendarClock size={17} style={{ color: '#b45309' }} />
          <span>Renewal window is open — {stats.days_to_expiry} day{stats.days_to_expiry === 1 ? '' : 's'} until it expires on <b>{dateFmt(amc.end_date)}</b>.</span>
        </div>
      )}

      <div className="wt-kpis">
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Status</span>
          <b><Pill value={amc.status} /></b>
          {/*
            * The pill is the STORED status; `expired` is derived from the end
            * date. They disagree when a contract lapses and nobody updates the
            * record — showing "Active" beside "cover has lapsed" reads as a bug,
            * so the mismatch is named rather than left for the operator to
            * reconcile.
            */}
          {stats.expired && String(amc.status).toLowerCase() === 'active' ? (
            <span className="wt-kpi-sub" style={{ color: 'var(--wt-red)' }}>
              still recorded as Active — the term ended {dateFmt(amc.end_date)}
            </span>
          ) : (
            <span className="wt-kpi-sub">{amc.start_date ? `${dateFmt(amc.start_date)} → ${dateFmt(amc.end_date)}` : '—'}</span>
          )}
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Visits</span>
          <b>{stats.completed} / {stats.planned}</b>
          <span className="wt-kpi-sub">{stats.completion_pct}% complete{stats.overdue ? ` · ${stats.overdue} overdue` : ''}</span>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Contract value</span>
          <b>{bdt(billing.contract_value ?? amc.annual_value)}</b>
          <span className="wt-kpi-sub">{billing.instalments || 1} × {amc.payment_frequency || 'instalment'}</span>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Next visit</span>
          <b style={{ fontSize: 15 }}>{stats.next_visit ? dateFmt(stats.next_visit.due_date) : '—'}</b>
          <span className="wt-kpi-sub">{stats.next_visit ? stats.next_visit.visit_type : 'nothing scheduled'}</span>
        </div>
      </div>

      <div className="wt-card wt-tblcard">
        <WtTabs tabs={['Visit plan', 'Billing', 'Contract']} value={tab} onChange={setTab} counts={counts} />

        {tab === 'Visit plan' && (visits.length ? (
          <table className="wt-tbl">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th><th style={{ width: 150 }}>Type</th>
                <th style={{ width: 110 }}>Due</th><th style={{ width: 110 }}>Scheduled</th>
                <th style={{ width: 110 }}>Completed</th><th style={{ width: 120 }}>Status</th>
                <th>Findings</th><th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => {
                const late = !['completed', 'cancelled'].includes(String(v.status || '').toLowerCase())
                  && v.due_date && v.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={v.id}>
                    <td className="id">{v.visit_no}</td>
                    <td>{v.visit_type}</td>
                    <td className={late ? undefined : 'muted'} style={late ? { color: 'var(--wt-red)', fontWeight: 600 } : undefined}>
                      {dateFmt(v.due_date)}
                    </td>
                    <td className="muted">{v.scheduled_date ? dateFmt(v.scheduled_date) : '—'}</td>
                    <td className="muted">{v.completed_date ? dateFmt(v.completed_date) : '—'}</td>
                    <td><Pill value={v.status} sm /></td>
                    <td className="muted" style={{ fontSize: 12 }}>{v.findings || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="wt-btn sm" onClick={() => setVisit(v)}>Update</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Visit plan" title="No visits generated" hint="A visit plan is created when the contract is activated." />)}

        {tab === 'Billing' && (
          <div style={{ padding: '4px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 22, marginBottom: 20 }}>
              <div>
                <h3 className="wt-section-title" style={{ fontSize: 13 }}>Derived from the contract</h3>
                <Field label="Contract value">{bdt(billing.contract_value ?? amc.annual_value)}</Field>
                <Field label="Payment frequency">{billing.payment_frequency || amc.payment_frequency}</Field>
                <Field label="Instalments">{billing.instalments}</Field>
                <Field label="Per instalment">{billing.per_instalment != null ? bdt(billing.per_instalment) : '—'}</Field>
                <Field label="Advance received">{num(amc.advance_amount) ? bdt(amc.advance_amount) : '—'}</Field>
              </div>
              <div>
                <h3 className="wt-section-title" style={{ fontSize: 13 }}>Invoices raised</h3>
                {amcInvoices.length ? amcInvoices.map((i) => (
                  <Field key={i.id} label={<Link to={`${svcBase()}/invoices/${i.code}`}>{i.code}</Link>}>
                    {bdt(i.amount)} <Pill value={i.status} sm />
                  </Field>
                )) : <p className="wt-subtitle">No instalment invoices raised yet.</p>}
              </div>
            </div>
            <button className="wt-btn" onClick={() => nav(`/water-tank/invoices?amc=${amc.code}`)}>
              <Receipt size={14} /> Open in invoices
            </button>
          </div>
        )}

        {tab === 'Contract' && (
          <div style={{ padding: '4px 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 26 }}>
            <div>
              <h3 className="wt-section-title" style={{ fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}><User size={14} /> Client</h3>
              <Field label="Name">{amc.client_name}</Field>
              <Field label="Type">{amc.client_type ? titleCase(amc.client_type) : '—'}</Field>
              <Field label="Contact">{amc.contact_person}</Field>
              <Field label="Phone">{amc.phone}</Field>
              <Field label="Email">{amc.email}</Field>
              {client?.code && <Field label="Client file"><Link to={`${svcBase()}/clients/${client.code}`}>{client.code}</Link></Field>}
            </div>
            <div>
              <h3 className="wt-section-title" style={{ fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}><MapPin size={14} /> Site</h3>
              <Field label="Address">{amc.site_address}</Field>
              <Field label="Area">{amc.area}</Field>
              <Field label="Tanks">{amc.tanks_count}</Field>
              <Field label="Tank type">{amc.tank_type}</Field>
              <Field label="Capacity">{amc.tank_capacity}</Field>
            </div>
            <div>
              <h3 className="wt-section-title" style={{ fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}><Shield size={14} /> Cover</h3>
              <Field label="Package">{amc.package}</Field>
              <Field label="Frequency">{amc.frequency}</Field>
              <Field label="Response time">{amc.response_hours ? `${amc.response_hours} hours` : '—'}</Field>
              <Field label="Emergency call-outs">{amc.emergency_included ? (amc.emergency_callouts_included || 'Included') : 'Not included'}</Field>
              <Field label="Water testing">{amc.water_testing_included ? 'Included' : 'Not included'}</Field>
              <Field label="Auto renew">{amc.auto_renew ? 'Yes' : 'No'}</Field>
              {amc.agreement_code && <Field label="Agreement">{amc.agreement_code}</Field>}
              {amc.provider_name && <Field label="Provider">{amc.provider_name}</Field>}
            </div>
          </div>
        )}
      </div>

      {stats.avg_satisfaction != null && (
        <div className="wt-card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--wt-green, #059669)' }} />
          <span>Average client satisfaction across completed visits: <b>{stats.avg_satisfaction} / 5</b></span>
        </div>
      )}

      {editing && (
        <EditDrawer amc={amc} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }} />
      )}

      {visit && (
        <VisitDrawer amcCode={amc.code} visit={visit}
          onClose={() => setVisit(null)}
          onSaved={() => { setVisit(null); load(); }} />
      )}
    </>
  );
}
