import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, MessageSquareQuote } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, DataTable, Drawer, Field, Input, Textarea, Select, SearchInput, Badge } from '../../ui/kit';

const STAGES = [['new', 'New'], ['screening', 'Screening'], ['qualified', 'Qualified'], ['inspection', 'Inspection'], ['negotiation', 'Negotiation'], ['closed', 'Closed'], ['lost', 'Lost']];
const STAGE_LABEL = Object.fromEntries(STAGES);
const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const EMPTY = { enquirer_name: '', company_name: '', phone: '', email: '', enquiry_type: 'buyer', interest: '', preferred_industry: '', preferred_location: '', budget: '', source: '', buyer_seriousness: 'medium', financial_capability: 'unknown', business_listing_id: '', stage: 'new', message: '', next_action: '', follow_up_date: '' };

export default function BusinessEnquiries() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [drawer, setDrawer] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/business-enquiries', { params: { limit: 200, ...(stageFilter !== 'all' ? { stage: stageFilter } : {}), ...(search ? { search } : {}) } });
      setRows(r.data.data || []);
    } catch { toast.error('Failed to load business enquiries'); }
    finally { setLoading(false); }
  }, [stageFilter, search, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/business-listings', { params: { limit: 200 } }).then((r) => setListings(r.data.data || [])).catch(() => {}); }, []);

  const set = (k, v) => setDrawer((d) => ({ ...d, form: { ...d.form, [k]: v } }));
  const save = async () => {
    if (!drawer.form.enquirer_name.trim()) { toast.error('Enquirer name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...drawer.form, business_listing_id: drawer.form.business_listing_id || null };
      if (drawer.id) await api.put(`/business-enquiries/${drawer.id}`, payload);
      else await api.post('/business-enquiries', payload);
      toast.success(drawer.id ? 'Enquiry updated' : 'Enquiry created');
      setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { key: 'enquiry_code', label: 'Code', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.enquiry_code}</span> },
    { key: 'enquirer_name', label: 'Enquirer', render: (r) => (<div><div style={{ fontWeight: 700 }}>{r.enquirer_name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{[r.phone, r.email].filter(Boolean).join(' · ')}</div></div>) },
    { key: 'interest', label: 'Interest', render: (r) => r.interest || r.preferred_industry || '—' },
    { key: 'budget', label: 'Budget', render: (r) => money(r.budget) },
    { key: 'listing', label: 'For business', render: (r) => r.listing?.business_name || '—' },
    { key: 'stage', label: 'Stage', render: (r) => <Badge tone="violet">{STAGE_LABEL[r.stage] || r.stage}</Badge> },
  ], []);

  return (
    <div className="pm-scope">
      <PageHead title="Business Buyer Enquiries" desc="Buyers & investors interested in acquiring a business — screening and lead pipeline (SOP Steps 11–12)."
        actions={<Button icon={Plus} onClick={() => setDrawer({ id: null, form: { ...EMPTY } })}>New Enquiry</Button>} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '4px 0 12px', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search enquirer, code, interest…" />
        <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="all">All stages</option>
          {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => setDrawer({ id: r.id, form: { ...EMPTY, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) } })}
        empty="No buyer enquiries yet." />

      {drawer && (
        <Drawer open title={drawer.id ? `Edit — ${drawer.form.enquirer_name || 'Enquiry'}` : 'New Buyer Enquiry'} width={560}
          onClose={() => setDrawer(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : (drawer.id ? 'Save changes' : 'Create enquiry')}</Button>
          </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Enquirer name" required full><Input value={drawer.form.enquirer_name} onChange={(e) => set('enquirer_name', e.target.value)} /></Field>
            <Field label="Company"><Input value={drawer.form.company_name} onChange={(e) => set('company_name', e.target.value)} /></Field>
            <Field label="Type"><Select value={drawer.form.enquiry_type} onChange={(e) => set('enquiry_type', e.target.value)}><option value="buyer">Buyer</option><option value="investor">Investor</option><option value="seller">Seller</option></Select></Field>
            <Field label="Phone"><Input value={drawer.form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><Input value={drawer.form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Interest (business type)"><Input value={drawer.form.interest} onChange={(e) => set('interest', e.target.value)} placeholder="e.g. Restaurant / F&B" /></Field>
            <Field label="Preferred location"><Input value={drawer.form.preferred_location} onChange={(e) => set('preferred_location', e.target.value)} /></Field>
            <Field label="Budget (৳)"><Input type="number" value={drawer.form.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
            <Field label="For business (optional)" full>
              <Select value={drawer.form.business_listing_id || ''} onChange={(e) => set('business_listing_id', e.target.value)}>
                <option value="">— General enquiry —</option>
                {listings.map((l) => <option key={l.id} value={l.id}>{l.business_code} · {l.business_name}</option>)}
              </Select>
            </Field>
            <Field label="Buyer seriousness"><Select value={drawer.form.buyer_seriousness} onChange={(e) => set('buyer_seriousness', e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
            <Field label="Financial capability"><Select value={drawer.form.financial_capability} onChange={(e) => set('financial_capability', e.target.value)}><option value="verified">Verified</option><option value="claimed">Claimed</option><option value="unknown">Unknown</option></Select></Field>
            <Field label="Stage"><Select value={drawer.form.stage} onChange={(e) => set('stage', e.target.value)}>{STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Source"><Input value={drawer.form.source} onChange={(e) => set('source', e.target.value)} /></Field>
            <Field label="Next action"><Input value={drawer.form.next_action} onChange={(e) => set('next_action', e.target.value)} /></Field>
            <Field label="Follow-up date"><Input type="date" value={drawer.form.follow_up_date || ''} onChange={(e) => set('follow_up_date', e.target.value)} /></Field>
            <Field label="Message / notes" full><Textarea rows={3} value={drawer.form.message} onChange={(e) => set('message', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
