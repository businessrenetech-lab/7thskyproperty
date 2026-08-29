import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Eye, Trash2, ChevronRight, ArrowRight, Phone, Globe, ClipboardList,
  FileText, CalendarClock, RefreshCw, MessageSquarePlus,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, WtTabs, Pill, StatCards, dateFmt, dateTimeFmt, useCollection, CreateDrawer,
  RecordDrawer, StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, useUrlTab,
  parseJson, toast, errText,
} from './common';

/*
 * Service Requests — the front door. Two registers behind one screen:
 *   Enquiries  everything the website and phone bring in, waiting to be triaged
 *   Requests   the qualified jobs, each routed to an assessment or a quotation
 */

const REQUEST_STATUSES = ['New', 'Assessment Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const ENQUIRY_STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Unqualified'];
const SOURCE_ICON = { Website: Globe, Phone, WhatsApp: MessageSquarePlus, 'Walk-in': ClipboardList };

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

const ENQUIRY_FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'site_address', label: 'Site address' },
  { key: 'district', label: 'District' },
  { key: 'property_type', label: 'Property type' },
  { key: 'tank_type', label: 'Tank type' },
  { key: 'tanks_count', label: 'Number of tanks', type: 'number' },
  { key: 'preferred_date', label: 'Preferred date', type: 'date' },
  { key: 'source', label: 'Source', type: 'select', options: ['Website', 'Phone', 'WhatsApp', 'Facebook', 'Walk-in', 'Referral'] },
  { key: 'status', label: 'Status', type: 'select', options: ENQUIRY_STATUSES, pill: true },
  { key: 'assigned_officer', label: 'Assigned officer' },
  { key: 'message', label: 'What the client asked for', type: 'textarea' },
  { key: 'notes', label: 'Internal notes', type: 'textarea' },
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

/* ═══ ENQUIRIES ═══════════════════════════════════════════════ */

function EnquiriesRegister({ nav }) {
  const [data, setData] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/wt-intake/enquiries')
      .then((r) => setData(r.data))
      .catch((e) => setError(errText(e, 'Could not load enquiries')))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const rows = data.rows || [];
  const s = data.summary || {};

  const counts = useMemo(() => {
    const c = { All: rows.length };
    ENQUIRY_STATUSES.forEach((st) => { c[st] = rows.filter((r) => (r.status || '').toLowerCase() === st.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.status || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.phone, r.email, r.site_address].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  const patch = async (id, body, msg) => {
    try { await api.patch(`/wt-intake/enquiries/${id}`, body); if (msg) toast.ok(msg); load(); }
    catch (e) { toast.err(errText(e)); }
  };
  const remove = async (r) => {
    try { await api.delete(`/wt-intake/enquiries/${r.id}`); toast.ok(`${r.code} deleted`); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  if (loading) return <Loading />;

  return (
    <>
      <StatCards items={[
        { label: 'New Enquiries', value: `${s.new || 0}`, sub: 'Not yet contacted', color: s.new ? 'var(--wt-red)' : undefined },
        { label: 'In Conversation', value: `${(s.contacted || 0) + (s.qualified || 0)}`, sub: `${s.qualified || 0} qualified`, color: 'var(--wt-amber)' },
        { label: 'Converted', value: `${s.converted || 0}`, sub: 'Became service requests', color: 'var(--wt-green)' },
        { label: 'Conversion Rate', value: s.conversion_rate == null ? '—' : `${s.conversion_rate}%`, sub: 'Converted vs. closed enquiries' },
      ]} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="wt-search" style={{ flex: '1 0 220px', maxWidth: 340 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search enquiries…" />
        </label>
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={() => setCreating(true)}><Plus size={14} /> Log an enquiry</button>
      </div>

      <WtTabs tabs={['All', ...ENQUIRY_STATUSES]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {error ? (
          <EmptyState eyebrow="Error" title="Could not load enquiries" hint={error}
            action={<button className="wt-btn" onClick={load}>Retry</button>} />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead><tr>
              <th style={{ width: 92 }}>Ref</th><th>Client</th><th style={{ width: 128 }}>Phone</th>
              <th style={{ width: 180 }}>Services asked for</th><th style={{ width: 110 }}>Source</th>
              <th style={{ width: 130 }}>Received</th><th style={{ width: 132 }}>Status</th>
              <th style={{ width: 150 }} /><th style={{ width: 44 }} />
            </tr></thead>
            <tbody>
              {shown.map((r) => {
                const svc = parseJson(r.services_requested, []) || [];
                const Icon = SOURCE_ICON[r.source] || Globe;
                const converted = (r.status || '').toLowerCase() === 'converted';
                return (
                  <tr key={r.id} className="click" onClick={() => setOpen(r)}>
                    <td className="id">{r.code}</td>
                    <td>
                      <strong>{r.client_name}</strong>
                      {r.site_address && <span className="cell-sub">{r.site_address}</span>}
                    </td>
                    <td className="muted">{r.phone}</td>
                    <td>
                      {svc.length
                        ? <><span className="wt-pill sm slate">{svc[0]}</span>{svc.length > 1 && <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>+{svc.length - 1}</span>}</>
                        : <span className="muted">{r.message ? r.message.slice(0, 34) + (r.message.length > 34 ? '…' : '') : '—'}</span>}
                    </td>
                    <td className="muted"><Icon size={11} style={{ verticalAlign: -1 }} /> {r.source}</td>
                    <td className="muted">{dateTimeFmt(r.createdAt)}</td>
                    <td>
                      <StatusCell value={r.status} options={ENQUIRY_STATUSES}
                        onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {converted
                        ? <button className="wt-btn sm" onClick={() => nav(`/water-tank/service-requests?focus=${encodeURIComponent(r.converted_request_code)}`)}>
                            {r.converted_request_code} <ChevronRight size={11} />
                          </button>
                        : <button className="wt-btn sm primary" onClick={() => nav(`/water-tank/service-requests/new?enquiry=${r.code}`)}>
                            <ArrowRight size={12} /> Add service request
                          </button>}
                    </td>
                    <td>
                      <RowActions items={[
                        { label: 'Open', icon: Eye, onClick: () => setOpen(r) },
                        !converted && { label: 'Add service request', icon: ArrowRight, onClick: () => nav(`/water-tank/service-requests/new?enquiry=${r.code}`) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            eyebrow="Enquiries"
            title={q ? `Nothing matches “${q}”.` : `No enquiries in “${tab}”.`}
            hint={q ? undefined : 'Website enquiries land here automatically. You can also log one taken over the phone.'}
            action={!q && <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={14} /> Log an enquiry</button>}
          />
        )}
      </div>

      {creating && (
        <CreateDrawer entity="__enquiry" singular="enquiry" fields={ENQUIRY_FIELDS}
          initial={{ source: 'Phone', status: 'New' }}
          onClose={() => setCreating(false)}
          onDone={() => { setCreating(false); load(); }}
          postTo="/wt-intake/enquiries" />
      )}

      {current && (
        <RecordDrawer
          record={current} singular="enquiry" fields={ENQUIRY_FIELDS}
          title={current.client_name} subtitle={`${current.code} · ${current.source}`}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current)}
          advanceLabel="Add service request"
          onAdvance={(current.status || '').toLowerCase() === 'converted'
            ? undefined
            : () => nav(`/water-tank/service-requests/new?enquiry=${current.code}`)}
        />
      )}
    </>
  );
}

/* ═══ REQUESTS ════════════════════════════════════════════════ */

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
            hint={q ? undefined : 'Raise one from an enquiry, or start a new request directly.'}
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
