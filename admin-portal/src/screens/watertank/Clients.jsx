import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Eye, Trash2, FileText } from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, useCollection, RecordDrawer, StatusCell, RowActions, Loading, EmptyState, toast, errText, svcEquip } from './common';

const PER = 10;
const STATUSES = ['New Lead', 'Assessment Scheduled', 'Active (AMC)', 'Completed', 'Dormant'];

// Field defs are built per service line so the equipment rows carry the right
// wording (Tank Type / Tank Capacity vs System Type / Capacity …).
const buildFields = (eq) => [
  { key: 'name', label: 'Client name', required: true },
  { key: 'client_type', label: 'Type', type: 'select', options: ['Residential', 'Commercial', 'Industrial'] },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'district', label: 'District' },
  { key: 'service_address', label: 'Service address' },
  { key: 'property_type', label: 'Property type' },
  { key: 'lead_source', label: 'Lead source' },
  { key: 'current_status', label: 'Status', type: 'select', options: STATUSES, pill: true },
  { key: 'assigned_officer', label: 'Assigned officer' },
  { key: 'tanks_count', label: eq.count_label, type: 'number' },
  { key: 'tank_type', label: eq.type_label, type: 'select', options: eq.type_options },
  { key: 'tank_capacity', label: eq.capacity_label },
  { key: 'last_cleaning', label: 'Last service' },
  { key: 'key_issues', label: 'Key issues', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Clients() {
  const nav = useSvcNav();
  const FIELDS = buildFields(svcEquip());
  const { rows, loading, error, reload, patch, remove } = useCollection('clients');
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [ptype, setPtype] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const districts = useMemo(() => [...new Set(rows.map((r) => r.district).filter(Boolean))], [rows]);
  const ptypes = useMemo(() => [...new Set(rows.map((r) => r.property_type).filter(Boolean))], [rows]);
  const statuses = useMemo(() => [...new Set(rows.map((r) => r.current_status).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (!district || r.district === district)
      && (!ptype || r.property_type === ptype)
      && (!status || r.current_status === status)
      && (!term || [r.code, r.name, r.mobile, r.email, r.assigned_officer].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, district, ptype, status, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  const pageRows = filtered.slice((page - 1) * PER, page * PER);
  const filtersOn = district || ptype || status || q;
  const clear = () => { setDistrict(''); setPtype(''); setStatus(''); setQ(''); setPage(1); };

  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  // log a service request straight off a client record
  const raiseRequest = async (client) => {
    try {
      const r = await api.post('/wt-ops/service-requests', {
        client_name: client.name,
        request_date: new Date().toISOString().slice(0, 10),
        status: 'New', priority: 'Medium',
        address: client.service_address || null,
        assigned_officer: client.assigned_officer || null,
      });
      toast.ok(`Request ${r.data.code} logged for ${client.name}`);
      nav(`/water-tank/service-requests?focus=${encodeURIComponent(r.data.code)}`);
    } catch (e) { toast.err(errText(e, 'Could not log the request')); }
  };

  return (
    <>
      <WtHead
        title="Clients Master Database"
        subtitle="Every water-tank client, their property and service standing"
        search={q} onSearch={(v) => { setQ(v); setPage(1); }}
      >
        <button className="wt-btn primary" onClick={() => nav('/water-tank/clients/new')}><Plus size={15} /> New Client</button>
      </WtHead>

      <div className="wt-filterbar">
        <span className="lead"><Filter /> Filter By:</span>
        <select className="wt-select" style={{ width: 160 }} value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1); }}><option value="">District (All)</option>{districts.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="wt-select" style={{ width: 180 }} value={ptype} onChange={(e) => { setPtype(e.target.value); setPage(1); }}><option value="">Property Type (All)</option>{ptypes.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="wt-select" style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Current Status (All)</option>{statuses.map((d) => <option key={d}>{d}</option>)}</select>
        {filtersOn && <button className="wt-btn" onClick={clear}>Clear Filters</button>}
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load clients" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : (
          <>
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 106 }}>Client ID</th><th>Client Name</th><th style={{ width: 104 }}>Type</th><th style={{ width: 126 }}>Mobile</th><th style={{ width: 104 }}>District</th><th style={{ width: 134 }}>Property Type</th><th style={{ width: 168 }}>Current Status</th><th style={{ width: 132 }}>Assigned Officer</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="click" onClick={() => nav(`/water-tank/clients/${r.code}`)}>
                    <td className="id">{r.code}</td>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.client_type}</td>
                    <td className="muted">{r.mobile || '—'}</td>
                    <td className="muted">{r.district || '—'}</td>
                    <td className="muted">{r.property_type || '—'}</td>
                    <td><StatusCell value={r.current_status} options={STATUSES} field="current_status"
                      onChange={(body) => patch(r.id, body, `${r.name} → ${body.current_status}`)} /></td>
                    <td className="muted">{r.assigned_officer || '—'}</td>
                    <td>
                      <RowActions items={[
                        { label: 'Open file', icon: Eye, onClick: () => nav(`/water-tank/clients/${r.code}`) },
                        { label: 'Quick edit', icon: FileText, onClick: () => setOpen(r) },
                        { label: 'Log service request', icon: Plus, onClick: () => raiseRequest(r) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.name} deleted`).catch((e) => toast.err(errText(e))) },
                      ]} />
                    </td>
                  </tr>
                ))}
                {!pageRows.length && <tr className="wt-empty-row"><td colSpan={9}>{filtersOn ? 'No clients match these filters.' : 'No clients yet — use New Client to register one.'}</td></tr>}
              </tbody>
            </table>
            <div className="wt-tblfoot">
              <span>Showing {pageRows.length} of {filtered.length} client{filtered.length === 1 ? '' : 's'}{filtered.length !== rows.length ? ` (${rows.length} total)` : ''}</span>
              {pages > 1 && (
                <div className="wt-pager">
                  <button className="wt-pagebtn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  {Array.from({ length: pages }, (_, i) => <button key={i} className={`wt-pagebtn${page === i + 1 ? ' on' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
                  <button className="wt-pagebtn" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {current && (
        <RecordDrawer
          record={current} singular="client" fields={FIELDS}
          title={current.name} subtitle={current.code}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.name} deleted`)}
          advanceLabel="Open full file"
          onAdvance={() => nav(`/water-tank/clients/${current.code}`)}
        />
      )}
    </>
  );
}
