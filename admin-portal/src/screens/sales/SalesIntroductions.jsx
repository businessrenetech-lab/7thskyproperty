// admin-portal/src/screens/sales/SalesIntroductions.jsx
//
// Branch-level list of protected introductions (clause 22 / non-circumvention)
// across all sale properties. Read-only here — records are created/edited on the
// property file's Introductions section. Row -> that property file.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, DataTable, StatusBadge, SearchInput, Badge, Select } from '../../ui/kit';
import { propertyFilePath } from './paths';

const STATUSES = ['active', 'breached', 'closed'];

export default function SalesIntroductions({ category = 'residential' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const status = params.get('status') || '';
  const expiry = params.get('expiry') || '';
  const setParam = (k, v) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (expiry) q.set('expiry', expiry);
      const { data } = await api.get(`/sales/introductions${q.toString() ? `?${q}` : ''}`);
      setRows(data.data || []);
    } catch { toast.error('Failed to load introductions'); } finally { setLoading(false); }
  }, [toast, status, expiry]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'record_code', header: 'Ref', render: (r) => <span className="code-chip">{r.record_code}</span> },
    { key: 'property', header: 'Property', render: (r) => r.property ? `${r.property.property_code} · ${r.property.title || ''}` : '—' },
    { key: 'buyer', header: 'Buyer', render: (r) => r.buyer?.full_name || '—' },
    { key: 'seller', header: 'Seller', render: (r) => r.seller?.full_name || '—' },
    { key: 'introduction_date', header: 'Introduced', render: (r) => r.introduction_date || '—' },
    { key: 'protection', header: 'Protection', render: (r) => r.protection_until ? <span>{r.protection_until} <Badge tone={r.expired ? 'red' : 'green'}>{r.expired ? 'Expired' : `${r.days_remaining}d`}</Badge></span> : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filtered = rows.filter((r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHead title="Introductions" desc="Protected buyer introductions (clause 22) across all sale properties." />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px', minWidth: 160 }}><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search introductions…" /></div>
          <Select value={status} onChange={(e) => setParam('status', e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          <Select value={expiry} onChange={(e) => setParam('expiry', e.target.value)}><option value="">Any window</option><option value="active">Active protection</option><option value="expired">Expired</option></Select>
        </div>
      </div>
      <div className="card"><DataTable columns={columns} rows={filtered} loading={loading} onRowClick={(r) => navigate(`${propertyFilePath(category, r.property_id)}?section=introductions`)} /></div>
    </>
  );
}
