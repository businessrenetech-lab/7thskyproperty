import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, RefreshCw, CalendarClock } from 'lucide-react';
import {
  WtHead, Pill, dateFmt, bdt, useCollection, CreateDrawer, RecordDrawer, WtDrawer,
  StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, toast, errText,
} from './common';

const STATUSES = ['Active', 'Proposed', 'Expired', 'Cancelled'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Six-Monthly', 'Annually'];

const FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'package', label: 'Package' },
  { key: 'frequency', label: 'Frequency', type: 'select', options: FREQUENCIES },
  { key: 'start_date', label: 'Start date', type: 'date' },
  { key: 'end_date', label: 'End date', type: 'date' },
  { key: 'next_visit', label: 'Next visit' },
  { key: 'annual_value', label: 'Annual value (৳)', type: 'number', money: true },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES, pill: true },
];

const num = (v) => Number(v || 0);
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);
const plusYear = (d) => {
  const base = d ? new Date(d) : new Date();
  base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().slice(0, 10);
};

/* Renew a contract for another term. */
function RenewDrawer({ contract, onClose, onConfirm }) {
  const [form, setForm] = useState({ end_date: plusYear(contract.end_date), annual_value: num(contract.annual_value), next_visit: contract.next_visit || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await onConfirm({ ...form, status: 'Active' }); }
    catch (e) { setErr(errText(e, 'Could not renew the contract')); setBusy(false); }
  };
  return (
    <WtDrawer title="Renew Contract" subtitle={`${contract.code} · ${contract.client_name}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Renewing…' : 'Renew contract'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-note">Current term ends {dateFmt(contract.end_date)}. Renewing extends the contract and returns it to Active.</div>
      <div className="wt-field"><label>New end date</label>
        <input className="wt-input" type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} /></div>
      <div className="wt-field"><label>Annual value (৳)</label>
        <input className="wt-input" type="number" value={form.annual_value} onChange={(e) => setForm((s) => ({ ...s, annual_value: Number(e.target.value) }))} /></div>
      <div className="wt-field"><label>Next visit</label>
        <input className="wt-input" value={form.next_visit} onChange={(e) => setForm((s) => ({ ...s, next_visit: e.target.value }))} /></div>
    </WtDrawer>
  );
}

export default function Amc() {
  const nav = useNavigate();
  const { rows, loading, error, reload, patch, remove } = useCollection('amc');
  const [pkg, setPkg] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [view, setView] = useState('Ledger Table');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [renewing, setRenewing] = useState(null);
  // Now that a contract has its own page, a palette deep-link lands there
  // rather than on a drawer over the register.
  useFocusedRecord(rows, (r) => nav(`/water-tank/amc/${r.code}`));

  const packages = useMemo(() => [...new Set(rows.map((r) => r.package).filter(Boolean))], [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (!pkg || r.package === pkg)
      && (statusFilter === 'All' || (r.status || '').toLowerCase() === statusFilter.toLowerCase())
      && (!term || [r.code, r.client_name, r.package].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, pkg, statusFilter, q]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => (r.status || '').toLowerCase() === 'active');
    const expired = rows.filter((r) => (r.status || '').toLowerCase() === 'expired');
    const dueSoon = active.filter((r) => { const d = daysTo(r.end_date); return d != null && d >= 0 && d <= 60; });
    return {
      annual: active.reduce((s, r) => s + num(r.annual_value), 0),
      activeCount: active.length,
      renewal: active.length + expired.length ? Math.round((active.length / (active.length + expired.length)) * 1000) / 10 : null,
      dueSoon: dueSoon.length,
      dueSoonValue: dueSoon.reduce((s, r) => s + num(r.annual_value), 0),
    };
  }, [rows]);

  const current = open ? rows.find((r) => r.id === open.id) || open : null;
  const calendar = shown.filter((r) => r.next_visit && !/none/i.test(r.next_visit));

  const doRenew = async (body) => {
    await patch(renewing.id, body, `${renewing.code} renewed to ${dateFmt(body.end_date)}`);
    setRenewing(null);
  };

  return (
    <>
      <WtHead
        title="Annual Maintenance Contracts (AMC)"
        subtitle="Recurring service contracts, visit scheduling and renewals"
        search={q} onSearch={setQ}
      >
        {/* The wizard builds the term, the visit plan and the billing together.
            The old quick-create drawer stays for a bare summary row. */}
        <button className="wt-btn" onClick={() => setCreating(true)}><Plus size={15} /> Quick add</button>
        <button className="wt-btn primary" onClick={() => nav('/water-tank/amc/create-amc')}>
          <Plus size={15} /> Create AMC
        </button>
      </WtHead>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select className="wt-select" style={{ width: 170 }} value={pkg} onChange={(e) => setPkg(e.target.value)}>
          <option value="">Package (All)</option>{packages.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="wt-select" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(pkg || statusFilter !== 'All' || q) && (
          <button className="wt-btn" onClick={() => { setPkg(''); setStatusFilter('All'); setQ(''); }}>Clear filters</button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: '#fff', border: '1px solid var(--wt-line)', borderRadius: 8, padding: 4 }}>
          {['Ledger Table', 'Visit Calendar'].map((v) => (
            <button key={v} className={`wt-btn sm${view === v ? ' primary' : ''}`} style={{ border: 0 }} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'Ledger Table' ? (
        <div className="wt-card wt-tblcard">
          {loading ? <Loading /> : error ? (
            <EmptyState eyebrow="Error" title="Could not load contracts" hint={error}
              action={<button className="wt-btn" onClick={reload}>Retry</button>} />
          ) : (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 86 }}>AMC ID</th><th>Client Name</th><th style={{ width: 152 }}>Package</th><th style={{ width: 104 }}>Frequency</th><th style={{ width: 98 }}>Start Date</th><th style={{ width: 120 }}>End Date</th><th style={{ width: 116 }}>Next Visit</th><th style={{ width: 128 }}>Status</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const d = daysTo(r.end_date);
                  const expiring = (r.status || '').toLowerCase() === 'active' && d != null && d >= 0 && d <= 60;
                  return (
                    <tr key={r.id} className="click" onClick={() => nav(`/water-tank/amc/${r.code}`)}>
                      <td className="id">{r.code}</td>
                      <td><strong>{r.client_name}</strong></td>
                      <td className="muted">{r.package || '—'}</td>
                      <td className="muted">{r.frequency || '—'}</td>
                      <td className="muted">{dateFmt(r.start_date)}</td>
                      <td style={{ color: expiring ? 'var(--wt-amber)' : 'var(--wt-muted)', fontWeight: expiring ? 700 : 400 }}>
                        {dateFmt(r.end_date)}{expiring ? ` · ${d}d` : ''}
                      </td>
                      <td style={{ fontWeight: 600, color: /none/i.test(r.next_visit || '') || !r.next_visit ? 'var(--wt-muted)' : 'var(--wt-accent-ink)' }}>{r.next_visit || '—'}</td>
                      <td><StatusCell value={r.status} options={STATUSES} onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} /></td>
                      <td>
                        <RowActions items={[
                          { label: 'Open', icon: Eye, onClick: () => nav(`/water-tank/amc/${r.code}`) },
                          { label: 'Renew contract', icon: RefreshCw, onClick: () => setRenewing(r) },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && <tr className="wt-empty-row"><td colSpan={9}>{q ? `Nothing matches “${q}”.` : 'No contracts match these filters.'}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="wt-card" style={{ padding: 22 }}>
          <div className="wt-sec-title" style={{ marginBottom: 14 }}>Scheduled Visits ({calendar.length})</div>
          {calendar.length ? (
            <div className="wt-milestones">
              {calendar.map((r) => (
                <div key={r.id} className="wt-milestone click" onClick={() => nav(`/water-tank/amc/${r.code}`)} style={{ cursor: 'pointer' }}>
                  <div className="mh"><span className="mt">{r.client_name}</span><Pill value={r.status} sm /></div>
                  <div className="amt" style={{ fontSize: 15 }}><CalendarClock size={14} style={{ verticalAlign: -2, marginRight: 5 }} />{r.next_visit}</div>
                  <div className="dt">{r.code} · {r.package || 'Standard'} · {r.frequency}</div>
                </div>
              ))}
            </div>
          ) : <EmptyState eyebrow="Visit Calendar" title="No visits scheduled" hint="Set a Next Visit on a contract and it will appear here." />}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="wt-two">
        <div className="wt-card" style={{ padding: 20 }}>
          <div className="wt-sec-title" style={{ marginBottom: 12 }}>AMC Portfolio</div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Active Annual Value</div><div style={{ fontSize: 20, fontWeight: 800 }}>{bdt(stats.annual)}</div><div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{stats.activeCount} active contract{stats.activeCount === 1 ? '' : 's'}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Renewal Rate</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wt-green)' }}>{stats.renewal == null ? '—' : `${stats.renewal}%`}</div><div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>active vs. lapsed</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Expiring in 60 Days</div><div style={{ fontSize: 20, fontWeight: 800, color: stats.dueSoon ? 'var(--wt-amber)' : 'var(--wt-ink)' }}>{stats.dueSoon}</div><div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{bdt(stats.dueSoonValue)} at risk</div></div>
          </div>
        </div>
        <div className="wt-card" style={{ padding: 20 }}>
          <div className="wt-sec-title" style={{ marginBottom: 12 }}>Standard Service Levels</div>
          <p style={{ fontSize: 12.5, color: 'var(--wt-muted)', lineHeight: 1.6, margin: 0 }}>All Commercial AMC customers are guaranteed 48-hour response times for emergency leaks, bio-hazard disinfection verification, and compliance certificate issuance within 5 business days of service completion. Standard billing cycle is 50% in advance.</p>
        </div>
      </div>

      {creating && (
        <CreateDrawer entity="amc" singular="contract" fields={FIELDS} initial={{ status: 'Active', frequency: 'Quarterly' }}
          onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />
      )}

      {current && !renewing && (
        <RecordDrawer
          record={current} singular="contract" fields={FIELDS} subtitle={current.client_name}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)}
          advanceLabel="Renew" onAdvance={() => setRenewing(current)}
        />
      )}

      {renewing && <RenewDrawer contract={renewing} onClose={() => setRenewing(null)} onConfirm={doRenew} />}

      <style>{`@media (max-width:1100px){ .wt-two{ grid-template-columns:1fr!important } }`}</style>
    </>
  );
}
