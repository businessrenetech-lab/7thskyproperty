import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Badge, Drawer, SearchInput, KV, Spinner, Field, Input, Select, Button } from '../ui/kit';
import ContactDetail from './ContactDetail';

const ROLE_TABS = [
  { key: '', label: 'All' }, { key: 'buyer', label: 'Buyers' }, { key: 'seller', label: 'Sellers' },
  { key: 'landlord', label: 'Landlords' }, { key: 'tenant', label: 'Tenants' },
  { key: 'service', label: 'Service' }, { key: 'nrb', label: 'NRB' },
];

const roleBadges = (c) => (
  <div className="wrap-gap">
    {c.is_buyer && <Badge tone="blue">Buyer</Badge>}
    {c.is_seller && <Badge tone="blue">Seller</Badge>}
    {c.is_landlord && <Badge tone="green">Landlord</Badge>}
    {c.is_tenant && <Badge tone="amber">Tenant</Badge>}
    {c.is_service_client && <Badge tone="grey">Service</Badge>}
    {c.is_nrb_client && <Badge tone="blue">NRB</Badge>}
  </div>
);

export default function Clients() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(''); const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  const [pa, setPa] = useState({ email: '', password: '', role: 'buyer' });
  const [activeContactId, setActiveContactId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: 25 });
      if (role) p.set('role', role);
      if (search) p.set('search', search);
      const { data } = await api.get(`/clients?${p}`);
      setRows(data.data || []); setTotal(data.pagination?.total || 0);
    } catch { toast.error('Failed to load clients'); } finally { setLoading(false); }
  }, [role, search, toast]);
  useEffect(() => { load(); }, [load]);

  const open = (r) => {
    setActiveContactId(r.contact_id);
  };

  const columns = [
    { key: 'client_code', header: 'Code', render: (r) => <span className="code-chip">{r.client_code}</span> },
    { key: 'name', header: 'Client', render: (r) => <div className="cell-strong">{r.Contact?.full_name || '—'}</div> },
    { key: 'contact', header: 'Contact', render: (r) => <div className="cell-sub">{r.Contact?.primary_phone || r.Contact?.email || '—'}</div> },
    { key: 'roles', header: 'Roles', render: roleBadges },
    { key: 'segment', header: 'Segment', render: (r) => <Badge tone={r.client_segment === 'vip' ? 'amber' : 'grey'}>{r.client_segment}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (activeContactId) {
    return (
      <ContactDetail contactId={activeContactId} onBack={() => { setActiveContactId(null); load(); }} />
    );
  }

  return (
    <>
      <PageHead title="Clients" desc="Buyers, sellers, landlords, tenants, service & NRB clients." />
      <div className="tabs">
        {ROLE_TABS.map((t) => <div key={t.key} className={`tab ${role === t.key ? 'active' : ''}`} onClick={() => setRole(t.key)}>{t.label}</div>)}
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client name, phone, email…" /></div>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={open} />
        <div className="pagination"><span>{total} client{total === 1 ? '' : 's'}</span></div>
      </div>

      {sel && (
        <Drawer title={detail?.data?.Contact?.full_name || 'Client'} onClose={() => setSel(null)}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 16 }}><span className="code-chip">{detail.data.client_code}</span><StatusBadge status={detail.data.status} /></div>
              {roleBadges(detail.data)}
              <div className="form-section-title">Profile</div>
              <KV k="Phone" v={detail.data.Contact?.primary_phone} />
              <KV k="Email" v={detail.data.Contact?.email} />
              <KV k="District" v={detail.data.Contact?.district} />
              <KV k="Segment" v={detail.data.client_segment} />
              <KV k="Portal access" v={detail.data.portal_enabled ? 'Enabled' : 'Disabled'} />
              {!detail.data.portal_enabled && (
                <>
                  <div className="form-section-title">Enable portal access</div>
                  <div className="form-grid">
                    <Field label="Login email"><Input value={pa.email} onChange={(e) => setPa({ ...pa, email: e.target.value })} /></Field>
                    <Field label="Temp password"><Input value={pa.password} onChange={(e) => setPa({ ...pa, password: e.target.value })} placeholder="Min 8, 1 upper, 1 number" /></Field>
                    <Field label="Portal role"><Select value={pa.role} onChange={(e) => setPa({ ...pa, role: e.target.value })}><option value="buyer">Buyer</option><option value="tenant">Tenant</option><option value="owner">Owner</option></Select></Field>
                  </div>
                  <Button variant="ghost" onClick={async () => {
                    try { await api.post(`/clients/${sel.id}/portal-access`, pa); toast.success('Portal access enabled'); const { data } = await api.get(`/clients/${sel.id}`); setDetail(data); }
                    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                  }}>Create portal login</Button>
                </>
              )}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
