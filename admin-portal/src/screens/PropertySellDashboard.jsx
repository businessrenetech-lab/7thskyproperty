import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Eye, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, SearchInput, Spinner, Button } from '../ui/kit';
import { NewPropertyDrawer } from './CrmForms';
import PropertySellDetail from './PropertySellDetail';

const money = (v) => (v == null ? '৳0.00' : '৳' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function PropertySellDashboard({ category, title, desc }) {
  const toast = useToast();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [create, setCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Query properties filtering by listing_type=sale and category
      const { data } = await api.get(`/properties?listing_type=sale&category=${category}&limit=100`);
      setRows(data.data || []);
    } catch {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (selectedId) {
    return <PropertySellDetail propertyId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const columns = [
    { key: 'property_code', header: 'Property Code', render: (r) => <span className="code-chip">{r.property_code}</span> },
    {
      key: 'title',
      header: 'Property Details',
      render: (r) => (
        <div className="cell-strong">
          {r.title}
          <div className="cell-sub">{[r.property_type, r.category].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (r) => [r.area, r.district || r.city].filter(Boolean).join(', ') || '—' },
    { key: 'owner', header: 'Owner', render: (r) => r.owner?.full_name || '—' },
    { key: 'agent', header: 'Listing Agent', render: (r) => r.manager?.full_name || '—' },
    { key: 'price', header: 'Listed Price', render: (r) => money(r.price) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'view', header: '', render: () => <span className="btn btn-ghost btn-sm"><Eye size={14} /> View Dashboard</span> },
  ];

  return (
    <>
      <PageHead
        title={title}
        desc={desc}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button icon={ListChecks} variant="secondary" onClick={() => nav('/role-onboarding')}>Onboarding</Button>
            <Button icon={Plus} onClick={() => setCreate(true)}>
              New Listing
            </Button>
          </div>
        }
      />
      {create && <NewPropertyDrawer category={category} onClose={() => setCreate(false)} onSaved={load} />}
      
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings by title, code or area…"
          />
        </div>
      </div>
      
      <div className="card">
        <DataTable
          columns={columns}
          rows={rows.filter((r) => {
            if (!search) return true;
            const term = search.toLowerCase();
            return (
              r.title?.toLowerCase().includes(term) ||
              r.property_code?.toLowerCase().includes(term) ||
              r.area?.toLowerCase().includes(term) ||
              r.district?.toLowerCase().includes(term)
            );
          })}
          loading={loading}
          onRowClick={(r) => setSelectedId(r.id)}
        />
      </div>
    </>
  );
}
