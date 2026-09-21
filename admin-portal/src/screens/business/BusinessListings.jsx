import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Tags, Layers, Coins } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, StatCard, DataTable, Drawer, SearchInput, Select, Badge } from '../../ui/kit';
import BusinessListingForm, { BUSINESS_STAGES, STAGE_LABEL, EMPTY_LISTING } from './BusinessListingForm';

const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);

export default function BusinessListings({ listingType = 'sale' }) {
  const isRent = listingType === 'rent';
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [form, setForm] = useState(null); // create drawer form | null
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        api.get('/business-listings', { params: { limit: 200, listing_type: listingType, ...(stageFilter !== 'all' ? { stage: stageFilter } : {}), ...(search ? { search } : {}) } }),
        api.get('/business-listings/stats', { params: { listing_type: listingType } }),
      ]);
      setRows(l.data.data || []);
      setStats(s.data.data || null);
    } catch { toast.error('Failed to load business listings'); }
    finally { setLoading(false); }
  }, [stageFilter, search, listingType, toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const create = async () => {
    if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/business-listings', form);
      toast.success('Business listing created');
      setForm(null);
      navigate(`/business-rent/listings/${data.data.id}`);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { key: 'business_code', label: 'Code', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.business_code}</span> },
    { key: 'business_name', label: 'Business', render: (r) => (<div><div style={{ fontWeight: 700 }}>{r.business_name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{[r.business_type, r.city].filter(Boolean).join(' · ')}</div></div>) },
    { key: 'price', label: isRent ? 'Monthly Rent' : 'Indicative Price', render: (r) => isRent ? (r.monthly_rent ? money(r.monthly_rent) + '/mo' : '—') : money(r.indicative_price) },
    { key: 'stage', label: 'Stage', render: (r) => <Badge tone="violet">{STAGE_LABEL[r.stage] || r.stage}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'sold' ? 'green' : r.status === 'active' ? 'blue' : 'grey'}>{r.status}</Badge> },
    { key: 'seller', label: 'Seller', render: (r) => r.seller?.full_name || '—' },
  ], []);

  return (
    <div className="pm-scope">
      <PageHead title={isRent ? 'Rental Listings' : 'Business Listings'} desc={isRent ? 'Businesses / premises engaged for lease — rent, deposit, lease term and SOP pipeline stage.' : 'Businesses engaged for sale — profile, financials and SOP pipeline stage.'}
        actions={<Button icon={Plus} onClick={() => setForm({ ...EMPTY_LISTING, listing_type: listingType })}>{isRent ? 'New Rental Listing' : 'New Business Listing'}</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '10px 0 18px' }}>
        <StatCard icon={Building2} label="Total listings" value={stats?.total ?? '—'} tone="violet" />
        <StatCard icon={Coins} label={isRent ? 'Monthly rent pipeline' : 'Pipeline value'} value={stats ? money(stats.pipeline_value) : '—'} tone="green" />
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

      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => navigate(`/business-rent/listings/${r.id}`)}
        empty={isRent ? 'No rental listings yet — add a business/premises engaged for lease.' : 'No business listings yet — click “New Business Listing” to add the first seller engagement.'} />

      {form && (
        <Drawer open title={isRent ? 'New Rental Listing' : 'New Business Listing'} width={620} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>{saving ? 'Saving…' : 'Create listing'}</Button>
          </div>}>
          <BusinessListingForm form={form} set={set} />
        </Drawer>
      )}
    </div>
  );
}
