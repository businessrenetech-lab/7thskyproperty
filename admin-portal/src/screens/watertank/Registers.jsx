import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, MessageSquareWarning, AlertOctagon, Plus, Eye, Trash2, ExternalLink } from 'lucide-react';
import { useSvcNav,
  WtHead, WtTabs, Pill, StatCards, dateFmt, useCollection, RecordDrawer,
  StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, useRoutedRecord, toast, errText, svcRegisters,
} from './common';
import RegisterModal from './RegisterModal';

/*
 * Warranty & Issues registers for the Water Tank service line.
 * Moved here from Property Care and rewired to water-tank records:
 *   Warranties → wt_warranties (cover on completed work orders)
 *   Complaints → wt_complaints (the existing incident desk, summarised)
 *   Incidents  → wt_incidents (safety / contamination / damage events)
 */

const WARRANTY_STATUSES = ['Active', 'Expiring', 'Expired', 'Claimed', 'Void'];
const INCIDENT_STATUSES = ['Open', 'Investigating', 'Closed'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/*
 * These describe the READ drawer only. Creating no longer uses them: a warranty,
 * complaint or incident is created through RegisterModal, which starts from the
 * job and lets the server resolve the client, project, property and provider —
 * so those four are shown here but are no longer typed.
 */
const warrantyFields = (rg) => [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'work_order_code', label: 'Work order', hint: 'The completed job this cover applies to.' },
  { key: 'project_id', label: 'Project ID' },
  { key: 'site_address', label: 'Property' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'warranty_type', label: 'Warranty type', hint: rg.warranty_hint },
  { key: 'start_date', label: 'Start date', type: 'date' },
  { key: 'expiry_date', label: 'Expiry date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: WARRANTY_STATUSES, pill: true },
  { key: 'coverage', label: 'What is covered', type: 'textarea' },
  { key: 'terms', label: 'Terms', type: 'textarea' },
  { key: 'claim_notes', label: 'Claim notes', type: 'textarea' },
];

const incidentFields = (rg) => [
  { key: 'incident_type', label: 'Incident type', type: 'select', options: rg.incident_types },
  { key: 'severity', label: 'Severity', type: 'select', options: SEVERITIES, pill: true },
  { key: 'incident_date', label: 'Date', type: 'date' },
  { key: 'client_name', label: 'Client' },
  { key: 'location', label: 'Location' },
  { key: 'work_order_code', label: 'Work order' },
  { key: 'project_id', label: 'Project ID' },
  { key: 'site_address', label: 'Property' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'reported_by', label: 'Reported by' },
  { key: 'status', label: 'Status', type: 'select', options: INCIDENT_STATUSES, pill: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'action_taken', label: 'Action taken', type: 'textarea' },
];

const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);

/** How a complaint reached us. Rows written before this existed read as staff. */
const RAISED_BY = { client: 'Client', provider: 'Provider', staff: 'Our team' };

/* ── Warranties ───────────────────────────────────────────── */
function Warranties() {
  const rg = svcRegisters();
  const { rows, loading, error, reload, patch, remove } = useCollection('warranties');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const routed = useRoutedRecord({ rows, base: '/water-tank/registers/warranties', current: open, setCurrent: setOpen });
  useFocusedRecord(rows, (r) => routed.open(r));

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
                  <tr key={r.id} className="click" onClick={() => routed.open(r)}>
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
                        { label: 'Open', icon: Eye, onClick: () => routed.open(r) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Warranties" title={q ? `Nothing matches “${q}”.` : 'No warranties recorded'}
          hint={q ? undefined : `Register the cover you give clients on ${rg.warranty_scope}.`} />}
      </div>

      {creating && (
        <RegisterModal kind="warranties"
          onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
      )}
      {current && (
        <RecordDrawer record={current} singular="warranty" fields={warrantyFields(rg)} subtitle={current.client_name}
          onClose={routed.close}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)} />
      )}
    </>
  );
}

/* ── Complaints (summary of the incident desk) ─────────────── */
function ComplaintsRegister() {
  const nav = useSvcNav();
  const { rows, loading, error, reload } = useCollection('complaints');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => !term || [r.code, r.client_name, r.incident_type, r.work_order_code, r.details].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [rows, q]);

  const is = (r, s) => (r.status || '').toLowerCase() === s;
  const open = rows.filter((r) => is(r, 'open')).length;
  const investigating = rows.filter((r) => is(r, 'investigating')).length;
  const resolved = rows.filter((r) => is(r, 'resolved') || is(r, 'closed')).length;
  // Split out because the two are not the same signal: a complaint the client
  // made themselves is worth a different response from one we noticed ourselves.
  const fromClients = rows.filter((r) => r.raised_via === 'client').length;

  return (
    <>
      <StatCards items={[
        { label: 'Open', value: `${open}`, sub: 'Awaiting first response', color: open ? 'var(--wt-red)' : undefined },
        { label: 'Investigating', value: `${investigating}`, sub: 'Under active review', color: investigating ? 'var(--wt-amber)' : undefined },
        { label: 'Raised by Clients', value: `${fromClients}`, sub: `${rows.length - fromClients} logged by our team`, color: fromClients ? 'var(--wt-amber)' : undefined },
        { label: 'Resolved / Closed', value: `${resolved}`, sub: `${rows.length} logged in total`, color: 'var(--wt-green)' },
      ]} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="wt-search" style={{ flex: '1 0 200px', maxWidth: 320 }}>
          <input placeholder="Search complaints…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="wt-btn" style={{ marginLeft: 'auto' }} onClick={() => nav('/water-tank/complaints')}>
          <ExternalLink size={14} /> Complaints desk
        </button>
        <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Log Complaint</button>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load complaints" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 96 }}>Code</th><th>Client</th><th style={{ width: 168 }}>About</th><th style={{ width: 104 }}>Work Order</th><th style={{ width: 122 }}>Raised By</th><th style={{ width: 92 }}>Severity</th><th style={{ width: 106 }}>Logged</th><th style={{ width: 116 }}>Status</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/water-tank/complaints?focus=${encodeURIComponent(r.code)}`)}>
                  <td className="id" style={{ color: 'var(--wt-red)' }}>{r.code}</td>
                  <td><strong>{r.client_name}</strong></td>
                  <td className="muted" title={r.details || r.disclosure || ''}>{r.incident_type || '—'}</td>
                  <td className="id">{r.work_order_code || '—'}</td>
                  <td>{/* the answer to "did the customer tell us, or did we find it?" */}
                    <span className={`wt-chip${r.raised_via === 'client' ? ' warn' : ''}`}>
                      {RAISED_BY[r.raised_via] || RAISED_BY.staff}
                    </span>
                  </td>
                  <td><Pill value={r.severity} sm /></td>
                  <td className="muted">{dateFmt(r.logged_date || r.createdAt)}</td>
                  <td><Pill value={r.status} sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Complaints" title={q ? `Nothing matches “${q}”.` : 'No complaints logged'}
          hint={q ? undefined : 'Complaints raised by clients through their portal appear here alongside the ones our team logs.'} />}
      </div>

      {creating && (
        <RegisterModal kind="complaints"
          onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}

/* ── Incidents ────────────────────────────────────────────── */
function Incidents() {
  const rg = svcRegisters();
  const { rows, loading, error, reload, patch, remove } = useCollection('incidents');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const routed = useRoutedRecord({ rows, base: '/water-tank/registers/incidents', current: open, setCurrent: setOpen });
  useFocusedRecord(rows, (r) => routed.open(r));

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
                <tr key={r.id} className="click" onClick={() => routed.open(r)}>
                  <td className="id">{r.code}</td>
                  <td><strong>{r.incident_type || '—'}</strong></td>
                  <td className="muted">{[r.client_name, r.location].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="muted">{r.provider_name || '—'}</td>
                  <td><Pill value={r.severity} sm /></td>
                  <td className="muted">{dateFmt(r.incident_date)}</td>
                  <td><StatusCell value={r.status} options={INCIDENT_STATUSES} onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} /></td>
                  <td>
                    <RowActions items={[
                      { label: 'Open', icon: Eye, onClick: () => routed.open(r) },
                      { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Incidents" title={q ? `Nothing matches “${q}”.` : 'No incidents recorded'}
          hint={q ? undefined : `Log ${rg.incident_log} here.`} />}
      </div>

      {creating && (
        <RegisterModal kind="incidents"
          onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
      )}
      {current && (
        <RecordDrawer record={current} singular="incident" fields={incidentFields(rg)}
          subtitle={[current.client_name, current.location].filter(Boolean).join(' · ')}
          onClose={routed.close}
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
  /*
   * The tab lives in the PATH now (/water-tank/registers/incidents), not in
   * component state, so a register — and a record inside it — can be linked and
   * survives a refresh. ?tab= is still honoured for anything that already links
   * that way.
   */
  const { kind } = useParams();
  const nav = useSvcNav();
  const fromPath = TABS.find((t) => t.value.toLowerCase() === String(kind || '').toLowerCase());
  const [tab, setTab] = useState(fromPath?.value || 'Warranties');

  useEffect(() => {
    if (fromPath && fromPath.value !== tab) { setTab(fromPath.value); return; }
    if (kind) return;
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (!wanted) return;
    const hit = TABS.find((t) => t.value.toLowerCase() === wanted.toLowerCase());
    if (hit) setTab(hit.value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Changing tab changes the URL, so the back button walks the tabs.
  const goTab = (value) => {
    setTab(value);
    nav(`/water-tank/registers/${value.toLowerCase()}`);
  };

  return (
    <>
      <WtHead title="Warranty & Issues" subtitle="Warranties on completed work, client complaints and safety incidents" />
      <WtTabs tabs={TABS.map((t) => ({ value: t.value, label: t.value }))} value={tab} onChange={goTab} />
      {tab === 'Warranties' && <Warranties />}
      {tab === 'Complaints' && <ComplaintsRegister />}
      {tab === 'Incidents' && <Incidents />}
    </>
  );
}
