import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Eye, Trash2, FileText, CalendarClock, RefreshCw,
} from 'lucide-react';
import {
  WtHead, WtTabs, Pill, StatCards, dateFmt, useCollection,
  RecordDrawer, StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, useUrlTab,
  toast, errText,
} from './common';

/*
 * Service Requests — the single front door for water-tank work. A lead arriving
 * by any channel (website, phone, walk-in, referral) is captured directly as a
 * request and routed to an assessment or a quotation.
 */

const REQUEST_STATUSES = ['New', 'Assessment Scheduled', 'In Progress', 'Completed', 'Cancelled'];

const REQUEST_FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Site address' },
  { key: 'district', label: 'District' },
  { key: 'property_type', label: 'Property type' },
  { key: 'category', label: 'Category' },
  { key: 'specific_service', label: 'Specific service' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'], pill: true },
  { key: 'request_date', label: 'Request date', type: 'date' },
  { key: 'preferred_date', label: 'Preferred date', type: 'date' },
  { key: 'assessment_date', label: 'Assessment date', type: 'date' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'assigned_officer', label: 'Assigned officer' },
  { key: 'status', label: 'Status', type: 'select', options: REQUEST_STATUSES, pill: true },
  { key: 'description', label: 'Description', type: 'textarea' },
];

export default function ServiceRequests() {
  const nav = useNavigate();

  // Intake is standardised on the Service Request — it is the single front door
  // for water-tank work. The old separate "Enquiries" register has been retired
  // (a lead by any channel is captured directly as a request).
  return (
    <>
      <WtHead
        title="Service Requests"
        subtitle="The single intake for water-tank work — every lead, by any channel, captured here and routed to an assessment or a quotation"
      >
        <button className="wt-btn primary" onClick={() => nav('/water-tank/service-requests/new')}>
          <Plus size={15} /> New Request
        </button>
      </WtHead>

      <RequestsRegister nav={nav} />
    </>
  );
}

function RequestsRegister({ nav }) {
  const { rows, loading, error, reload, patch, remove } = useCollection('service-requests');
  const [tab, setTab] = useState('All');
  useUrlTab(['All', ...REQUEST_STATUSES], setTab);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  useFocusedRecord(rows, (r) => { setTab('All'); setOpen(r); });

  const counts = useMemo(() => {
    const c = { All: rows.length };
    REQUEST_STATUSES.forEach((s) => { c[s] = rows.filter((r) => (r.status || '').toLowerCase() === s.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.status || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.category, r.specific_service, r.provider_name, r.phone]
        .some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  const stats = useMemo(() => {
    const is = (r, s) => (r.status || '').toLowerCase() === s;
    return {
      open: rows.filter((r) => !is(r, 'completed') && !is(r, 'cancelled')).length,
      awaitingAssessment: rows.filter((r) => r.needs_assessment && !is(r, 'completed') && !is(r, 'cancelled')).length,
      quoted: rows.filter((r) => r.quotation_code).length,
      highPriority: rows.filter((r) => (r.priority || '').toLowerCase() === 'high' && !is(r, 'completed')).length,
    };
  }, [rows]);

  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  if (loading) return <Loading />;

  return (
    <>
      <StatCards items={[
        { label: 'Open Requests', value: `${stats.open}`, sub: 'Not completed or cancelled' },
        { label: 'Awaiting Assessment', value: `${stats.awaitingAssessment}`, sub: 'Site visit still to happen', color: stats.awaitingAssessment ? 'var(--wt-amber)' : undefined },
        { label: 'Quoted', value: `${stats.quoted}`, sub: 'Quotation raised', color: 'var(--wt-green)' },
        { label: 'High Priority', value: `${stats.highPriority}`, sub: 'Need attention first', color: stats.highPriority ? 'var(--wt-red)' : undefined },
      ]} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="wt-search" style={{ flex: '1 0 220px', maxWidth: 340 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests…" />
        </label>
        <button className="wt-btn" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>

      <WtTabs tabs={['All', ...REQUEST_STATUSES]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {error ? (
          <EmptyState eyebrow="Error" title="Could not load requests" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead><tr>
              <th style={{ width: 84 }}>Request</th><th>Client</th><th style={{ width: 150 }}>Service</th>
              <th style={{ width: 76 }}>Priority</th><th style={{ width: 104 }}>Requested</th>
              <th style={{ width: 168 }}>Routed to</th><th style={{ width: 132 }}>Provider</th>
              <th style={{ width: 140 }}>Status</th><th style={{ width: 44 }} />
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="click" onClick={() => setOpen(r)}>
                  <td className="id">{r.code}</td>
                  <td>
                    <strong>{r.client_name}</strong>
                    {r.phone && <span className="cell-sub">{r.phone}</span>}
                  </td>
                  <td className="muted">{r.specific_service || r.category || '—'}</td>
                  <td><Pill value={r.priority} sm /></td>
                  <td className="muted">{dateFmt(r.request_date)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {r.assessment_code && (
                      <button className="wt-btn sm" onClick={() => nav(`/water-tank/site-assessments/${r.assessment_code}`)}>
                        <CalendarClock size={11} /> {r.assessment_code}
                      </button>
                    )}
                    {r.quotation_code && (
                      <button className="wt-btn sm" onClick={() => nav(`/water-tank/quotations/${r.quotation_code}`)}>
                        <FileText size={11} /> {r.quotation_code}
                      </button>
                    )}
                    {!r.assessment_code && !r.quotation_code && <span className="muted">Not routed</span>}
                  </td>
                  <td className="muted">{r.provider_name || '—'}</td>
                  <td>
                    <StatusCell value={r.status} options={REQUEST_STATUSES}
                      onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} />
                  </td>
                  <td>
                    <RowActions items={[
                      { label: 'Open', icon: Eye, onClick: () => setOpen(r) },
                      r.assessment_code && { label: 'Open assessment', icon: CalendarClock, onClick: () => nav(`/water-tank/site-assessments/${r.assessment_code}`) },
                      r.quotation_code && { label: 'Open quotation', icon: FileText, onClick: () => nav(`/water-tank/quotations/${r.quotation_code}`) },
                      { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            eyebrow="Service Requests"
            title={q ? `Nothing matches “${q}”.` : `No requests in “${tab}”.`}
            hint={q ? undefined : 'Start a new request to capture a water-tank job.'}
            action={!q && <button className="wt-btn primary" onClick={() => nav('/water-tank/service-requests/new')}><Plus size={14} /> New request</button>}
          />
        )}
      </div>

      {current && (
        <RecordDrawer
          record={current} singular="request" fields={REQUEST_FIELDS}
          subtitle={`${current.code}${current.source ? ` · ${current.source}` : ''}`}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)}
          advanceLabel={current.assessment_code ? 'Open assessment' : current.quotation_code ? 'Open quotation' : undefined}
          onAdvance={current.assessment_code
            ? () => nav(`/water-tank/site-assessments/${current.assessment_code}`)
            : current.quotation_code
              ? () => nav(`/water-tank/quotations/${current.quotation_code}`)
              : undefined}
        />
      )}
    </>
  );
}
