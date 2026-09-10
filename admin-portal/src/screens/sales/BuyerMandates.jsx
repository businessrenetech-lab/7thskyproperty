// admin-portal/src/screens/sales/BuyerMandates.jsx
//
// Buyer mandates list: a buyer's requirements brief that exists before a
// property is chosen. Row -> the mandate detail (requirements + shortlist).
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, DataTable, StatusBadge, SearchInput, Drawer, Field, Input, Select, Textarea, Button, Spinner } from '../../ui/kit';
import { Combo } from '../../ui/pickers';
import { mandateDetailPath } from './paths';

const money = (v) => (v == null || v === '' ? '—' : 'BDT ' + Number(v).toLocaleString());
const clientLabel = (c) => `${c.Contact?.full_name || c.client_code}`;
const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`;
const STATUSES = ['active', 'engaged', 'fulfilled', 'cancelled'];

export default function BuyerMandates({ category = 'residential' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [fStatus, setFStatus] = useState('');
  const [create, setCreate] = useState(false); const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ buyer_client_id: null, buyer_contact_id: null, budget_min: '', budget_max: '', areas: '', property_type: '', beds_min: '', timeframe: '', notes: '' });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/buyer-mandates'); setRows(data.data || []); }
    catch { toast.error('Failed to load mandates'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!f.buyer_client_id && !f.buyer_contact_id) return toast.error('Pick a buyer client or contact');
    setSaving(true);
    try {
      await api.post('/buyer-mandates', f);
      toast.success('Mandate created');
      setCreate(false); setF({ buyer_client_id: null, buyer_contact_id: null, budget_min: '', budget_max: '', areas: '', property_type: '', beds_min: '', timeframe: '', notes: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'mandate_code', header: 'Mandate', render: (r) => <span className="code-chip">{r.mandate_code}</span> },
    { key: 'buyer', header: 'Buyer', render: (r) => r.buyer_name || '—' },
    { key: 'budget', header: 'Budget', render: (r) => `${money(r.budget_min)} – ${money(r.budget_max)}` },
    { key: 'areas', header: 'Areas', render: (r) => r.areas || '—' },
    { key: 'candidates', header: 'Shortlist', render: (r) => r.candidate_count ?? 0 },
    { key: 'assignee', header: 'Assignee', render: (r) => r.assignee?.name || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filtered = rows.filter((r) => (!fStatus || r.status === fStatus) && (!search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <PageHead title="Buyer Mandates" desc="A buyer's requirements brief and shortlist — before a specific property is chosen." actions={<Button icon={Plus} onClick={() => setCreate(true)}>New mandate</Button>} />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px', minWidth: 160 }}><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mandates…" /></div>
          <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        </div>
      </div>
      <div className="card"><DataTable columns={columns} rows={filtered} loading={loading} onRowClick={(r) => navigate(mandateDetailPath(category, r.id))} /></div>

      {create && (
        <Drawer title="New buyer mandate" onClose={() => setCreate(false)} footer={<><Button variant="ghost" onClick={() => setCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Buyer (client)"><Combo endpoint="/clients?role=buyer" labelFn={clientLabel} value={f.buyer_client_id} onChange={(v) => set('buyer_client_id', v)} placeholder="Search buyer client…" /></Field>
          <Field label="…or buyer (contact)"><Combo endpoint="/contacts" labelFn={contactLabel} value={f.buyer_contact_id} onChange={(v) => set('buyer_contact_id', v)} placeholder="Search contact…" /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Budget min"><Input type="number" value={f.budget_min} onChange={(e) => set('budget_min', e.target.value)} /></Field>
            <Field label="Budget max"><Input type="number" value={f.budget_max} onChange={(e) => set('budget_max', e.target.value)} /></Field>
          </div>
          <Field label="Preferred areas"><Input value={f.areas} onChange={(e) => set('areas', e.target.value)} placeholder="Gulshan, Banani…" /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Property type"><Input value={f.property_type} onChange={(e) => set('property_type', e.target.value)} placeholder="Apartment, House…" /></Field>
            <Field label="Beds (min)"><Input type="number" value={f.beds_min} onChange={(e) => set('beds_min', e.target.value)} /></Field>
          </div>
          <Field label="Timeframe"><Input value={f.timeframe} onChange={(e) => set('timeframe', e.target.value)} placeholder="e.g. 3 months" /></Field>
          <Field label="Notes"><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        </Drawer>
      )}
    </>
  );
}
