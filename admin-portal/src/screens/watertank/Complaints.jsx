import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Trash2, Siren, CheckCircle2, MessageSquarePlus, BellRing } from 'lucide-react';
import {
  WtHead, WtTabs, Pill, dateFmt, dateTimeFmt, StatCards, useCollection, CreateDrawer, RecordDrawer,
  WtDrawer, StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, useRoutedRecord, parseJson, toast, errText,
} from './common';

const STATUSES = ['Open', 'Investigating', 'Resolved', 'Closed'];
const TABS = ['All', ...STATUSES];

const FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'incident_type', label: 'Incident type' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['High', 'Medium', 'Low'], pill: true },
  { key: 'logged_date', label: 'Logged date', type: 'date' },
  { key: 'acknowledged_by', label: 'Acknowledged by' },
  { key: 'sla_due', label: 'SLA due' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES, pill: true },
  { key: 'resolution_hours', label: 'Resolution hours', type: 'number' },
  { key: 'resolved_date', label: 'Resolved date', type: 'date' },
  { key: 'disclosure', label: 'Incident disclosure', type: 'textarea' },
];

const num = (v) => Number(v || 0);

/* Append an escalation / action entry to the incident timeline. */
function TimelineDrawer({ complaint, title, label, defaultTitle, onClose, onConfirm }) {
  const [entry, setEntry] = useState({ title: defaultTitle || '', detail: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    if (!entry.title.trim()) { setErr('Give the entry a title.'); return; }
    setBusy(true); setErr('');
    try { await onConfirm({ ...entry, at: new Date().toISOString() }); }
    catch (e) { setErr(errText(e, 'Could not log the entry')); setBusy(false); }
  };

  return (
    <WtDrawer title={title} subtitle={`${complaint.code} · ${complaint.client_name}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Logging…' : label}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-field"><label>Entry title</label>
        <input className="wt-input" value={entry.title} onChange={(e) => setEntry((s) => ({ ...s, title: e.target.value }))} /></div>
      <div className="wt-field"><label>Detail</label>
        <textarea className="wt-input" rows={4} style={{ resize: 'vertical' }} value={entry.detail}
          onChange={(e) => setEntry((s) => ({ ...s, detail: e.target.value }))} /></div>
    </WtDrawer>
  );
}

export default function Complaints() {
  const { rows, loading, error, reload, patch, remove } = useCollection('complaints');
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [logging, setLogging] = useState(null); // { mode: 'dispatch' | 'note' }
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    STATUSES.forEach((s) => { c[s] = rows.filter((r) => (r.status || '').toLowerCase() === s.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.status || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.incident_type].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  useEffect(() => {
    if (shown.length && !shown.find((r) => r.id === sel?.id)) {
      setSel(shown.find((r) => (r.status || '').toLowerCase() === 'open') || shown[0]);
    }
  }, [shown, sel]);
  // The record now lives in the URL, so a complaint can be linked and bookmarked.
  const routed = useRoutedRecord({ rows, base: '/water-tank/complaints', current: open, setCurrent: setOpen });
  useFocusedRecord(rows, (r) => { setTab('All'); setSel(r); routed.open(r); });

  const selected = sel ? rows.find((r) => r.id === sel.id) || sel : null;
  const current = open ? rows.find((r) => r.id === open.id) || open : null;
  const timeline = parseJson(selected?.timeline, []) || [];
  const selStatus = (selected?.status || '').toLowerCase();

  // SLA figures derived from the complaints actually on file
  const stats = useMemo(() => {
    const resolved = rows.filter((r) => num(r.resolution_hours) > 0);
    const withinSla = resolved.filter((r) => num(r.resolution_hours) <= 24).length;
    const openRows = rows.filter((r) => (r.status || '').toLowerCase() === 'open');
    const critical = rows.filter((r) => (r.severity || '').toLowerCase() === 'high' && !['resolved', 'closed'].includes((r.status || '').toLowerCase())).length;
    return {
      avg: resolved.length ? Math.round((resolved.reduce((s, r) => s + num(r.resolution_hours), 0) / resolved.length) * 10) / 10 : null,
      resolvedCount: resolved.length,
      open: openRows.length,
      critical,
      compliance: resolved.length ? Math.round((withinSla / resolved.length) * 1000) / 10 : null,
      unacked: rows.filter((r) => !r.acknowledged_at && !['resolved', 'closed'].includes((r.status || '').toLowerCase())).length,
    };
  }, [rows]);

  const appendTimeline = async (entry) => {
    const target = logging.record;
    const existing = parseJson(target.timeline, []) || [];
    const body = { timeline: [...existing, entry] };
    if (logging.mode === 'dispatch') body.status = 'Investigating';
    await patch(target.id, body, logging.mode === 'dispatch' ? `Urgent dispatch logged on ${target.code}` : `Note added to ${target.code}`);
    setLogging(null);
  };

  // Sec. 11 — every complaint must be acknowledged within 1 business day
  const acknowledge = async (row) => {
    setBusy(true);
    const existing = parseJson(row.timeline, []) || [];
    try {
      await patch(row.id, {
        acknowledged_at: new Date().toISOString(),
        status: (row.status || '').toLowerCase() === 'open' ? 'Investigating' : row.status,
        timeline: [...existing, { title: 'Complaint acknowledged', detail: 'Acknowledged to the client within the 1 business day SLA (Sec. 11).', at: new Date().toISOString() }],
      }, `${row.code} acknowledged`);
    } catch (e) { toast.err(errText(e, 'Could not acknowledge')); }
    finally { setBusy(false); }
  };

  const resolve = async (row) => {
    setBusy(true);
    const logged = row.logged_date ? new Date(row.logged_date) : new Date(row.createdAt);
    const hours = Math.max(0.1, Math.round(((Date.now() - logged.getTime()) / 36e5) * 10) / 10);
    const existing = parseJson(row.timeline, []) || [];
    try {
      await patch(row.id, {
        status: 'Resolved',
        resolved_date: new Date().toISOString().slice(0, 10),
        resolution_hours: hours,
        timeline: [...existing, { title: 'Incident resolved', detail: `Closed out after ${hours} hours.`, at: new Date().toISOString() }],
      }, `${row.code} resolved in ${hours}h`);
    } catch (e) { toast.err(errText(e, 'Could not resolve the incident')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <WtHead
        title="Complaints & Resolutions"
        subtitle="Incident tracking, service SLA validation and escalation workflows"
        search={q} onSearch={setQ}
      >
        <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Log Complaint</button>
      </WtHead>

      <StatCards items={[
        { label: 'Avg Resolution Time', value: stats.avg == null ? '—' : `${stats.avg} hours`, sub: stats.resolvedCount ? `Across ${stats.resolvedCount} resolved incident${stats.resolvedCount === 1 ? '' : 's'}` : 'No incidents resolved yet' },
        { label: 'Open Incidents', value: `${stats.open} active`, sub: stats.critical ? `${stats.critical} flagged high severity` : 'None flagged high severity', color: stats.open ? 'var(--wt-red)' : undefined },
        { label: 'SLA Compliance Rate', value: stats.compliance == null ? '—' : `${stats.compliance}%`, sub: 'Resolved within the 24-hour target' },
        { label: 'Awaiting Acknowledgement', value: `${stats.unacked}`, sub: 'Sec. 11 — within 1 business day', color: stats.unacked ? 'var(--wt-amber)' : undefined },
      ]} />

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-split">
        <div className="wt-card wt-tblcard">
          {loading ? <Loading /> : error ? (
            <EmptyState eyebrow="Error" title="Could not load complaints" hint={error}
              action={<button className="wt-btn" onClick={reload}>Retry</button>} />
          ) : (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 96 }}>Complaint ID</th><th>Client Name</th><th style={{ width: 126 }}>Incident Type</th><th style={{ width: 84 }}>Severity</th><th style={{ width: 96 }}>SLA Due</th><th style={{ width: 132 }}>Status</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const s = (r.status || '').toLowerCase();
                  return (
                    <tr key={r.id} className={`click${selected?.id === r.id ? ' sel' : ''}`} onClick={() => setSel(r)}
                      style={{ background: s === 'open' ? '#fef2f2' : undefined }}>
                      <td className="id" style={{ color: 'var(--wt-red)' }}>{r.code}</td>
                      <td><strong>{r.client_name}</strong></td>
                      <td className="muted">{r.incident_type || '—'}</td>
                      <td><Pill value={r.severity} sm /></td>
                      <td style={{ color: s === 'open' ? 'var(--wt-red)' : 'var(--wt-muted)', fontWeight: 600 }}>{r.sla_due || '—'}</td>
                      <td><StatusCell value={r.status} options={STATUSES} onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} /></td>
                      <td>
                        <RowActions items={[
                          { label: 'Open', icon: Eye, onClick: () => routed.open(r) },
                          { label: 'Log entry', icon: MessageSquarePlus, onClick: () => setLogging({ record: r, mode: 'note' }) },
                          !r.acknowledged_at && { label: 'Acknowledge (Sec. 11)', icon: BellRing, onClick: () => acknowledge(r) },
                          s === 'open' && { label: 'Urgent Dispatch', icon: Siren, onClick: () => setLogging({ record: r, mode: 'dispatch' }) },
                          !['resolved', 'closed'].includes(s) && { label: 'Mark Resolved', icon: CheckCircle2, onClick: () => resolve(r) },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && <tr className="wt-empty-row"><td colSpan={7}>{q ? `Nothing matches “${q}”.` : `No complaints in “${tab}”.`}</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="wt-card wt-detailcard">
            {selStatus === 'open' && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--wt-red)' }}>Escalation SLA Warning (SLA Active)</div>}
            <h3>Incident {selected.code}</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill value={selected.severity} sm /><Pill value={selected.status} sm />
              <span className="muted" style={{ fontSize: 11.5 }}>Logged {dateFmt(selected.logged_date || selected.createdAt)}</span>
              {selected.acknowledged_at
                ? <span className="muted" style={{ fontSize: 11.5 }}>· acknowledged {dateTimeFmt(selected.acknowledged_at)}</span>
                : <span style={{ fontSize: 11.5, color: 'var(--wt-amber)', fontWeight: 700 }}>· awaiting acknowledgement</span>}
              {num(selected.resolution_hours) > 0 && <span className="muted" style={{ fontSize: 11.5 }}>· resolved in {selected.resolution_hours}h</span>}
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid var(--wt-line)', borderRadius: 8, padding: 12 }}>
              <div className="wt-sec-title" style={{ marginBottom: 6 }}>Incident Disclosure Detail</div>
              <div style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.disclosure || '—'}</div>
            </div>
            <div className="wt-panel-head">
              <div className="wt-sec-title">Timeline &amp; Logged Escalations</div>
              <button className="wt-link" onClick={() => setLogging({ record: selected, mode: 'note' })}>Add entry</button>
            </div>
            <div className="wt-timeline">
              {timeline.map((t, i) => <div className="wt-tl" key={i}><div className="t">{t.title}</div><div className="d">{t.detail}</div><div className="m">{/^\d{4}-/.test(t.at || '') ? dateTimeFmt(t.at) : t.at}</div></div>)}
              {!timeline.length && <span className="muted" style={{ fontSize: 12.5 }}>No escalations logged.</span>}
            </div>
            {!selected.acknowledged_at && !['resolved', 'closed'].includes(selStatus) && (
              <div className="wt-note" style={{ background: 'var(--wt-amber-bg)', borderColor: '#fde68a', color: 'var(--wt-amber)' }}>
                <strong>Not acknowledged.</strong> Sec. 11 requires acknowledgement to the client within 1 business day of logging.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!selected.acknowledged_at && !['resolved', 'closed'].includes(selStatus) && (
                <button className="wt-btn" disabled={busy} style={{ flex: '1 0 100%', justifyContent: 'center' }} onClick={() => acknowledge(selected)}>
                  <BellRing size={14} /> Acknowledge complaint
                </button>
              )}
              {selStatus === 'open' && (
                <button className="wt-btn" disabled={busy} style={{ flex: '1 0 100%', justifyContent: 'center', background: 'var(--wt-red)', borderColor: 'var(--wt-red)', color: '#fff' }}
                  onClick={() => setLogging({ record: selected, mode: 'dispatch' })}>
                  <Siren size={14} /> Urgent Dispatch
                </button>
              )}
              {!['resolved', 'closed'].includes(selStatus) && (
                <button className="wt-btn primary" disabled={busy} style={{ flex: '1 0 100%', justifyContent: 'center' }} onClick={() => resolve(selected)}>
                  <CheckCircle2 size={14} /> Mark Resolved
                </button>
              )}
              {selStatus === 'resolved' && (
                <button className="wt-btn" disabled={busy} style={{ flex: '1 0 100%', justifyContent: 'center' }}
                  onClick={() => patch(selected.id, { status: 'Closed' }, `${selected.code} closed`).catch((e) => toast.err(errText(e)))}>
                  Close Incident
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {creating && (
        <CreateDrawer entity="complaints" singular="complaint" fields={FIELDS}
          initial={{ status: 'Open', severity: 'Medium', logged_date: new Date().toISOString().slice(0, 10) }}
          onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />
      )}

      {current && !logging && (
        <RecordDrawer
          record={current} singular="complaint" fields={FIELDS} subtitle={current.client_name}
          onClose={routed.close}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)}
        />
      )}

      {logging && (
        <TimelineDrawer
          complaint={logging.record}
          title={logging.mode === 'dispatch' ? 'Urgent Dispatch' : 'Log Timeline Entry'}
          label={logging.mode === 'dispatch' ? 'Dispatch & escalate' : 'Add entry'}
          defaultTitle={logging.mode === 'dispatch' ? 'Urgent dispatch raised' : ''}
          onClose={() => setLogging(null)}
          onConfirm={appendTimeline}
        />
      )}
    </>
  );
}
