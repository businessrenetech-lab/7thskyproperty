import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Building2, Plus, Tags, Layers, Coins } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, StatCard, DataTable, Drawer, Field, Input, Textarea, Select, SearchInput, Badge } from '../../ui/kit';

// SOP pipeline stages (Business_Sale_Workflow_and_Checklists) — order + labels.
export const BUSINESS_STAGES = [
  ['lead_intake', 'Lead Intake'], ['consultation', 'Consultation'], ['assessment', 'Assessment'],
  ['documentation', 'Documentation'], ['preparation', 'Preparation'], ['marketing', 'Marketing'],
  ['lead_mgmt', 'Lead Management'], ['inspection', 'Inspection'], ['negotiation', 'Negotiation'],
  ['due_diligence', 'Due Diligence'], ['agreement', 'Agreement'], ['settlement', 'Settlement'],
  ['financial', 'Financial'], ['closure', 'Closure'],
];
const STAGE_LABEL = Object.fromEntries(BUSINESS_STAGES);
const BUSINESS_TYPES = ['retail', 'restaurant', 'hospitality', 'manufacturing', 'service', 'trading', 'industrial', 'franchise', 'online', 'other'];
const STATUSES = ['active', 'under_offer', 'sold', 'withdrawn', 'on_hold'];
const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const EMPTY = { business_name: '', business_type: 'retail', industry: '', area: '', city: 'Dhaka', ownership_structure: '', company_registration_no: '', trade_licence_no: '', tin_bin: '', year_established: '', staff_count: '', lease_status: 'leased', lease_details: '', reason_for_sale: '', indicative_price: '', annual_turnover: '', annual_profit: '', included_assets: '', description: '', stage: 'lead_intake', status: 'active', special_requirements: '' };

export default function BusinessListings() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [drawer, setDrawer] = useState(null); // null | {form, id}
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        api.get('/business-listings', { params: { limit: 200, ...(stageFilter !== 'all' ? { stage: stageFilter } : {}), ...(search ? { search } : {}) } }),
        api.get('/business-listings/stats'),
      ]);
      setRows(l.data.data || []);
      setStats(s.data.data || null);
    } catch { toast.error('Failed to load business listings'); }
    finally { setLoading(false); }
  }, [stageFilter, search, toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setDrawer((d) => ({ ...d, form: { ...d.form, [k]: v } }));
  const openNew = () => setDrawer({ id: null, form: { ...EMPTY } });
  const openEdit = (r) => setDrawer({ id: r.id, form: { ...EMPTY, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) } });

  const save = async () => {
    if (!drawer.form.business_name.trim()) { toast.error('Business name is required'); return; }
    setSaving(true);
    try {
      if (drawer.id) await api.put(`/business-listings/${drawer.id}`, drawer.form);
      else await api.post('/business-listings', drawer.form);
      toast.success(drawer.id ? 'Listing updated' : 'Business listing created');
      setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { key: 'business_code', label: 'Code', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.business_code}</span> },
    { key: 'business_name', label: 'Business', render: (r) => (<div><div style={{ fontWeight: 700 }}>{r.business_name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{[r.business_type, r.city].filter(Boolean).join(' · ')}</div></div>) },
    { key: 'indicative_price', label: 'Indicative Price', render: (r) => money(r.indicative_price) },
    { key: 'stage', label: 'Stage', render: (r) => <Badge tone="violet">{STAGE_LABEL[r.stage] || r.stage}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'sold' ? 'green' : r.status === 'active' ? 'blue' : 'grey'}>{r.status}</Badge> },
    { key: 'seller', label: 'Seller', render: (r) => r.seller?.full_name || '—' },
  ], []);

  return (
    <div className="pm-scope">
      <PageHead title="Business Listings" desc="Businesses engaged for sale — profile, financials and SOP pipeline stage."
        actions={<Button icon={Plus} onClick={openNew}>New Business Listing</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '10px 0 18px' }}>
        <StatCard icon={Building2} label="Total listings" value={stats?.total ?? '—'} tone="violet" />
        <StatCard icon={Coins} label="Pipeline value" value={stats ? money(stats.pipeline_value) : '—'} tone="green" />
        <StatCard icon={Layers} label="Active" value={stats?.by_status?.active ?? 0} tone="blue" />
        <StatCard icon={Tags} label="Under offer" value={stats?.by_status?.under_offer ?? 0} tone="amber" />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search business, code, industry…" />
        <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="all">All stages</option>
          {BUSINESS_STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={openEdit}
        empty="No business listings yet — click “New Business Listing” to add the first seller engagement." />

      {drawer && (
        <Drawer open title={drawer.id ? `Edit — ${drawer.form.business_name || 'Business'}` : 'New Business Listing'} width={620}
          onClose={() => setDrawer(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : (drawer.id ? 'Save changes' : 'Create listing')}</Button>
          </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Business name" required full><Input value={drawer.form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g. Dhaka Delights Restaurant" /></Field>
            <Field label="Business type"><Select value={drawer.form.business_type} onChange={(e) => set('business_type', e.target.value)}>{BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
            <Field label="Industry"><Input value={drawer.form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Food & Beverage" /></Field>
            <Field label="Area"><Input value={drawer.form.area} onChange={(e) => set('area', e.target.value)} /></Field>
            <Field label="City"><Input value={drawer.form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Ownership structure"><Input value={drawer.form.ownership_structure} onChange={(e) => set('ownership_structure', e.target.value)} placeholder="Private Limited / Partnership…" /></Field>
            <Field label="Trade licence no."><Input value={drawer.form.trade_licence_no} onChange={(e) => set('trade_licence_no', e.target.value)} /></Field>
            <Field label="Company reg. no."><Input value={drawer.form.company_registration_no} onChange={(e) => set('company_registration_no', e.target.value)} /></Field>
            <Field label="TIN / BIN"><Input value={drawer.form.tin_bin} onChange={(e) => set('tin_bin', e.target.value)} /></Field>
            <Field label="Year established"><Input type="number" value={drawer.form.year_established} onChange={(e) => set('year_established', e.target.value)} /></Field>
            <Field label="Staff count"><Input type="number" value={drawer.form.staff_count} onChange={(e) => set('staff_count', e.target.value)} /></Field>
            <Field label="Lease status"><Select value={drawer.form.lease_status} onChange={(e) => set('lease_status', e.target.value)}><option value="leased">Leased</option><option value="owned">Owned</option><option value="na">N/A</option></Select></Field>
            <Field label="Indicative sale price (৳)"><Input type="number" value={drawer.form.indicative_price} onChange={(e) => set('indicative_price', e.target.value)} /></Field>
            <Field label="Annual turnover (৳)"><Input type="number" value={drawer.form.annual_turnover} onChange={(e) => set('annual_turnover', e.target.value)} /></Field>
            <Field label="Annual profit (৳)"><Input type="number" value={drawer.form.annual_profit} onChange={(e) => set('annual_profit', e.target.value)} /></Field>
            <Field label="SOP stage"><Select value={drawer.form.stage} onChange={(e) => set('stage', e.target.value)}>{BUSINESS_STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Status"><Select value={drawer.form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
            <Field label="Reason for sale" full><Textarea rows={2} value={drawer.form.reason_for_sale} onChange={(e) => set('reason_for_sale', e.target.value)} /></Field>
            <Field label="Included assets / stock" full><Textarea rows={2} value={drawer.form.included_assets} onChange={(e) => set('included_assets', e.target.value)} /></Field>
            <Field label="Description / highlights" full><Textarea rows={3} value={drawer.form.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <Field label="Special requirements" full><Textarea rows={2} value={drawer.form.special_requirements} onChange={(e) => set('special_requirements', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
