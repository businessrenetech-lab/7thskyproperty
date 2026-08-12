import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MessageSquareWarning, AlertOctagon, Plus, Eye, Trash2, ExternalLink } from 'lucide-react';
import {
  WtHead, WtTabs, Pill, StatCards, dateFmt, useCollection, CreateDrawer, RecordDrawer,
  StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, toast, errText,
} from './common';

/*
 * Warranty & Issues registers for the Water Tank service line.
 * Moved here from Property Care and rewired to water-tank records:
 *   Warranties → wt_warranties (cover on completed work orders)
 *   Complaints → wt_complaints (the existing incident desk, summarised)
 *   Incidents  → wt_incidents (safety / contamination / damage events)
 */

const WARRANTY_STATUSES = ['Active', 'Expiring', 'Expired', 'Claimed', 'Void'];
const INCIDENT_STATUSES = ['Open', 'Investigating', 'Closed'];
const INCIDENT_TYPES = ['Injury', 'Contamination', 'Property Damage', 'Environmental', 'Equipment Failure', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const WARRANTY_FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'work_order_code', label: 'Work order', hint: 'The completed job this cover applies to.' },
  { key: 'project_id', label: 'Project ID' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'warranty_type', label: 'Warranty type', hint: 'e.g. Cleaning & Disinfection, Waterproofing, Crack Repair.' },
  { key: 'start_date', label: 'Start date', type: 'date' },
  { key: 'expiry_date', label: 'Expiry date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: WARRANTY_STATUSES, pill: true },
  { key: 'coverage', label: 'What is covered', type: 'textarea' },
  { key: 'terms', label: 'Terms', type: 'textarea' },
  { key: 'claim_notes', label: 'Claim notes', type: 'textarea' },
];

const INCIDENT_FIELDS = [
  { key: 'incident_type', label: 'Incident type', type: 'select', options: INCIDENT_TYPES },
  { key: 'severity', label: 'Severity', type: 'select', options: SEVERITIES, pill: true },
  { key: 'incident_date', label: 'Date', type: 'date' },
  { key: 'client_name', label: 'Client' },
  { key: 'location', label: 'Location' },
  { key: 'work_order_code', label: 'Work order' },
  { key: 'project_id', label: 'Project ID' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'reported_by', label: 'Reported by' },
  { key: 'status', label: 'Status', type: 'select', options: INCIDENT_STATUSES, pill: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'action_taken', label: 'Action taken', type: 'textarea' },
];

const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);

/* ── Warranties ───────────────────────────────────────────── */
function Warranties() {
  const { rows, loading, error, reload, patch, remove } = useCollection('warranties');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  useFocusedRecord(rows, (r) => setOpen(r));

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => !term || [r.code, r.client_name, r.warranty_type, r.work_order_code, r.provider_name].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [rows, q]);

  const active = rows.filter((r) => (r.status || '').toLowerCase() === 'active');
  const expiring = active.filter((r) => { const d = daysTo(r.expiry_date); return d != null && d >= 0 && d <= 60; });
  const claimed = rows.filter((r) => (r.status || '').toLowerCase() === 'claimed');
  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  return (
    <>
      <StatCards items={[
        { label: 'Active Warranties', value: `${active.length}`, sub: `${rows.length} on the register`, color: 'var(--wt-green)' },
        { label: 'Expiring in 60 Days', value: `${expiring.length}`, sub: expiring.length ? 'Contact clients to renew' : 'Nothing lapsing soon', color: expiring.length ? 'var(--wt-amber)' : undefined },
        { label: 'Claims Made', value: `${claimed.length}`, sub: 'Cover called on by clients' },
      ]} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="wt-search" style={{ flex: '1 0 200px', maxWidth: 320 }}>
          <input placeholder="Search warranties…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={() => setCreating(true)}><Plus size={15} /> New Warranty</button>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load warranties" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 92 }}>Code</th><th>Client</th><th style={{ width: 176 }}>Warranty Type</th><th style={{ width: 104 }}>Work Order</th><th style={{ width: 104 }}>Start</th><th style={{ width: 130 }}>Expiry</th><th style={{ width: 128 }}>Status</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {shown.map((r) => {
                const d = daysTo(r.expiry_date);
                const soon = (r.status || '').toLowerCase() === 'active' && d != null && d >= 0 && d <= 60;
                const lapsed = d != null && d < 0;
                return (
                  <tr key={r.id} className="click" onClick={() => setOpen(r)}>
                    <td className="id">{r.code}</td>
                    <td><strong>{r.client_name}</strong></td>
                    <td className="muted">{r.warranty_type || '—'}</td>
                    <td className="id">{r.work_order_code || '—'}</td>
                    <td className="muted">{dateFmt(r.start_date)}</td>
                    <td style={{ color: lapsed ? 'var(--wt-red)' : soon ? 'var(--wt-amber)' : 'var(--wt-muted)', fontWeight: soon || lapsed ? 700 : 400 }}>
                      {dateFmt(r.expiry_date)}{soon ? ` · ${d}d` : lapsed ? ' · lapsed' : ''}
                    </td>
                    <td><StatusCell value={r.status} options={WARRANTY_STATUSES} onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} /></td>
                    <td>
                      <RowActions items={[
                        { label: 'Open', icon: Eye, onClick: () => setOpen(r) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Warranties" title={q ? `Nothing matches “${q}”.` : 'No warranties recorded'}
          hint={q ? undefined : 'Register the cover you give clients on completed cleaning, disinfection and repair work.'} />}
      </div>

      {creating && (
        <CreateDrawer entity="warranties" singular="warranty" fields={WARRANTY_FIELDS}
          initial={{ status: 'Active', start_date: new Date().toISOString().slice(0, 10) }}
          onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />
      )}
      {current && (
        <RecordDrawer record={current} singular="warranty" fields={WARRANTY_FIELDS} subtitle={current.client_name}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)} />
      )}
    </>
  );
}

/* ── Complaints (summary of the incident desk) ─────────────── */
function ComplaintsRegister() {
  const nav = useNavigate();
  const { rows, loading, error, reload } = useCollection('complaints');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => !term || [r.code, r.client_name, r.incident_type].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [rows, q]);

  const is = (r, s) => (r.status || '').toLowerCase() === s;
  const open = rows.filter((r) => is(r, 'open')).length;
  const investigating = rows.filter((r) => is(r, 'investigating')).length;
  const resolved = rows.filter((r) => is(r, 'resolved') || is(r, 'closed')).length;

  return (
    <>
      <StatCards items={[
        { label: 'Open', value: `${open}`, sub: 'Awaiting first response', color: open ? 'var(--wt-red)' : undefined },
        { label: 'Investigating', value: `${investigating}`, sub: 'Under active review', color: investigating ? 'var(--wt-amber)' : undefined },
        { label: 'Resolved / Closed', value: `${resolved}`, sub: `${rows.length} logged in total`, color: 'var(--wt-green)' },
      ]} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="wt-search" style={{ flex: '1 0 200px', maxWidth: 320 }}>
          <input placeholder="Search complaints…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={() => nav('/water-tank/complaints')}>
          <ExternalLink size={14} /> Open Complaints desk
        </button>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load complaints" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 96 }}>Code</th><th>Client</th><th style={{ width: 176 }}>Incident Type</th><th style={{ width: 96 }}>Severity</th><th style={{ width: 112 }}>Logged</th><th style={{ width: 116 }}>Resolution</th><th style={{ width: 120 }}>Status</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/water-tank/complaints?focus=${encodeURIComponent(r.code)}`)}>
                  <td className="id" style={{ color: 'var(--wt-red)' }}>{r.code}</td>
                  <td><strong>{r.client_name}</strong></td>
                  <td className="muted">{r.incident_type || '—'}</td>
                  <td><Pill value={r.severity} sm /></td>
                  <td className="muted">{dateFmt(r.logged_date || r.createdAt)}</td>
                  <td className="muted">{Number(r.resolution_hours) > 0 ? `${r.resolution_hours} h` : '—'}</td>
                  <td><Pill value={r.status} sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Complaints" title={q ? `Nothing matches “${q}”.` : 'No complaints logged'}
          hint={q ? undefined : 'Complaints are raised and worked on the Complaints desk; this register summarises them.'} />}
      </div>
    </>
  );
}

/* ── Incidents ────────────────────────────────────────────── */
function Incidents() {
  const { rows, loading, error, reload, patch, remove } = useCollection('incidents');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  useFocusedRecord(rows, (r) => setOpen(r));

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => !term || [r.code, r.client_name, r.incident_type, r.location, r.provider_name].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [rows, q]);

  const openCount = rows.filter((r) => (r.status || '').toLowerCase() !== 'closed').length;
  const critical = rows.filter((r) => ['high', 'critical'].includes((r.severity || '').toLowerCase()) && (r.status || '').toLowerCase() !== 'closed').length;
  const closed = rows.filter((r) => (r.status || '').toLowerCase() === 'closed').length;
  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  return (
    <>
      <StatCards items={[
        { label: 'Open Incidents', value: `${openCount}`, sub: 'Not yet closed out', color: openCount ? 'var(--wt-red)' : undefined },
        { label: 'High / Critical', value: `${critical}`, sub: 'Require escalation', color: critical ? 'var(--wt-red)' : undefined },
        { label: 'Closed', value: `${closed}`, sub: `${rows.length} on the register`, color: 'var(--wt-green)' },
      ]} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="wt-search" style={{ flex: '1 0 200px', maxWidth: 320 }}>
          <input placeholder="Search incidents…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={() => setCreating(true)}><Plus size={15} /> Log Incident</button>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load incidents" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 92 }}>Code</th><th style={{ width: 168 }}>Incident Type</th><th>Client / Location</th><th style={{ width: 150 }}>Provider</th><th style={{ width: 96 }}>Severity</th><th style={{ width: 110 }}>Date</th><th style={{ width: 136 }}>Status</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="click" onClick={() => setOpen(r)}>
                  <td className="id">{r.code}</td>
                  <td><strong>{r.incident_type || '—'}</strong></td>
                  <td className="muted">{[r.client_name, r.location].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="muted">{r.provider_name || '—'}</td>
                  <td><Pill value={r.severity} sm /></td>
                  <td className="muted">{dateFmt(r.incident_date)}</td>
                  <td><StatusCell value={r.status} options={INCIDENT_STATUSES} onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} /></td>
                  <td>
                    <RowActions items={[
                      { label: 'Open', icon: Eye, onClick: () => setOpen(r) },
                      { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Incidents" title={q ? `Nothing matches “${q}”.` : 'No incidents recorded'}
          hint={q ? undefined : 'Log injuries, contamination events, property damage and equipment failures here.'} />}
      </div>

      {creating && (
        <CreateDrawer entity="incidents" singular="incident" fields={INCIDENT_FIELDS}
          initial={{ status: 'Open', severity: 'Medium', incident_type: 'Other', incident_date: new Date().toISOString().slice(0, 10) }}
          onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />
      )}
      {current && (
        <RecordDrawer record={current} singular="incident" fields={INCIDENT_FIELDS}
          subtitle={[current.client_name, current.location].filter(Boolean).join(' · ')}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)} />
      )}
    </>
  );
}

const TABS = [
  { value: 'Warranties', icon: ShieldCheck },
  { value: 'Complaints', icon: MessageSquareWarning },
  { value: 'Incidents', icon: AlertOctagon },
];

export default function Registers() {
  const [tab, setTab] = useState('Warranties');

  // ?tab=incidents deep-links straight to a register
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (!wanted) return;
    const hit = TABS.find((t) => t.value.toLowerCase() === wanted.toLowerCase());
    if (hit) setTab(hit.value);
  }, []);

  return (
    <>
      <WtHead title="Warranty & Issues" subtitle="Warranties on completed work, client complaints and safety incidents" />
      <WtTabs tabs={TABS.map((t) => ({ value: t.value, label: t.value }))} value={tab} onChange={setTab} />
      {tab === 'Warranties' && <Warranties />}
      {tab === 'Complaints' && <ComplaintsRegister />}
      {tab === 'Incidents' && <Incidents />}
    </>
  );
}
