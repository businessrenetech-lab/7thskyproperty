import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Search, Target } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, StatCard, DataTable, Drawer, Field, Input, Textarea, Select, SearchInput, Badge } from '../../ui/kit';

export const MANDATE_STAGES = [
  ['consultation', 'Consultation'], ['search', 'Search'], ['shortlisting', 'Shortlisting'],
  ['inspection', 'Inspection'], ['negotiation', 'Negotiation'], ['due_diligence', 'Due Diligence'],
  ['agreement', 'Agreement'], ['settlement', 'Settlement'], ['closure', 'Closure'],
];
export const MANDATE_STAGE_LABEL = Object.fromEntries(MANDATE_STAGES);
const BUSINESS_TYPES = ['retail', 'restaurant', 'hospitality', 'manufacturing', 'service', 'trading', 'industrial', 'franchise', 'online', 'any'];
const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const EMPTY = { buyer_name: '', buyer_company: '', preferred_business_type: 'any', preferred_industry: '', preferred_location: 'Dhaka', budget_min: '', budget_max: '', purchase_purpose: 'investment', financing_status: 'cash', requirements: '', timeline: '', stage: 'consultation', status: 'active', notes: '' };

export default function BusinessMandates() {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([api.get('/business-mandates', { params: { limit: 200, ...(search ? { search } : {}) } }), api.get('/business-mandates/stats')]);
      setRows(l.data.data || []); setStats(s.data.data || null);
    } catch { toast.error('Failed to load mandates'); } finally { setLoading(false); }
  }, [search, toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const create = async () => {
    if (!form.buyer_name.trim()) { toast.error('Buyer name is required'); return; }
    setSaving(true);
    try { const { data } = await api.post('/business-mandates', form); toast.success('Mandate created'); setForm(null); navigate(`/business/mandates/${data.data.id}`); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { key: 'mandate_code', label: 'Code', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.mandate_code}</span> },
    { key: 'buyer_name', label: 'Buyer', render: (r) => (<div><div style={{ fontWeight: 700 }}>{r.buyer_name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.buyer_company || ''}</div></div>) },
    { key: 'looking', label: 'Looking for', render: (r) => [r.preferred_business_type, r.preferred_industry].filter((x) => x && x !== 'any').join(' · ') || 'Any business' },
    { key: 'budget', label: 'Budget', render: (r) => `${money(r.budget_min)} – ${money(r.budget_max)}` },
    { key: 'stage', label: 'Stage', render: (r) => <Badge tone="violet">{MANDATE_STAGE_LABEL[r.stage] || r.stage}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'completed' ? 'green' : r.status === 'active' ? 'blue' : 'grey'}>{r.status}</Badge> },
  ], []);

  return (
    <div className="pm-scope">
      <PageHead title="Acquisition Mandates" desc="Buyers looking to acquire a business — requirements, target shortlist and the Business Purchase pipeline."
        actions={<Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>New Mandate</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '10px 0 18px' }}>
        <StatCard icon={Briefcase} label="Total mandates" value={stats?.total ?? '—'} tone="violet" />
        <StatCard icon={Search} label="Searching" value={(stats?.by_stage?.search || 0) + (stats?.by_stage?.shortlisting || 0)} tone="blue" />
        <StatCard icon={Target} label="Active" value={stats?.by_status?.active ?? 0} tone="green" />
      </div>

      <div style={{ marginBottom: 12 }}><SearchInput value={search} onChange={setSearch} placeholder="Search buyer, code, industry…" /></div>

      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => navigate(`/business/mandates/${r.id}`)}
        empty="No acquisition mandates yet — add a buyer who wants to acquire a business." />

      {form && (
        <Drawer open title="New Acquisition Mandate" width={600} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? 'Saving…' : 'Create mandate'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Buyer name" required><Input value={form.buyer_name} onChange={(e) => set('buyer_name', e.target.value)} /></Field>
            <Field label="Buyer company"><Input value={form.buyer_company} onChange={(e) => set('buyer_company', e.target.value)} /></Field>
            <Field label="Preferred business type"><Select value={form.preferred_business_type} onChange={(e) => set('preferred_business_type', e.target.value)}>{BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
            <Field label="Preferred industry"><Input value={form.preferred_industry} onChange={(e) => set('preferred_industry', e.target.value)} /></Field>
            <Field label="Preferred location"><Input value={form.preferred_location} onChange={(e) => set('preferred_location', e.target.value)} /></Field>
            <Field label="Purpose"><Select value={form.purchase_purpose} onChange={(e) => set('purchase_purpose', e.target.value)}><option value="investment">Investment</option><option value="owner_operator">Owner-operator</option><option value="expansion">Expansion</option><option value="other">Other</option></Select></Field>
            <Field label="Budget min (৳)"><Input type="number" value={form.budget_min} onChange={(e) => set('budget_min', e.target.value)} /></Field>
            <Field label="Budget max (৳)"><Input type="number" value={form.budget_max} onChange={(e) => set('budget_max', e.target.value)} /></Field>
            <Field label="Financing"><Select value={form.financing_status} onChange={(e) => set('financing_status', e.target.value)}><option value="cash">Cash</option><option value="needs_finance">Needs finance</option><option value="pre_approved">Pre-approved</option></Select></Field>
            <Field label="Timeline"><Input value={form.timeline} onChange={(e) => set('timeline', e.target.value)} placeholder="e.g. 3–6 months" /></Field>
            <Field label="Requirements" full><Textarea rows={3} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
