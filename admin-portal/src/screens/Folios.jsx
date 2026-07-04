import React, { useCallback, useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, Drawer, KV, StatusBadge, Badge, Select, Spinner } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

export default function Folios() {
  const toast = useToast();
  const [tab, setTab] = useState('tenant');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [settings, setSettings] = useState({ folio_mode: 'one_folio_per_landlord_property' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/folios?type=${tab}&limit=100`); setRows(data.data || []); }
    catch { toast.error('Failed to load folios'); }
    finally { setLoading(false); }
  }, [tab, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/folios/settings').then(({ data }) => setSettings(data.data || settings)).catch(() => {}); }, []);

  const open = async (row) => {
    setDetail({ loading: true });
    try { const { data } = await api.get(`/folios/${row.id}`); setDetail(data); }
    catch { toast.error('Failed to load folio'); setDetail(null); }
  };
  const saveMode = async (mode) => {
    setSettings({ folio_mode: mode });
    try { await api.put('/folios/settings', { folio_mode: mode }); toast.success('Folio setting saved'); }
    catch { toast.error('Failed to save folio setting'); }
  };

  const columns = [
    { key: 'folio_code', header: 'Folio', render: (r) => <span className="code-chip">{r.folio_code}</span> },
    { key: 'contact', header: tab === 'tenant' ? 'Tenant' : 'Landlord', render: (r) => <div className="cell-strong">{r.contact?.full_name || r.tenant?.full_name || r.owner?.full_name || '—'}</div> },
    { key: 'property', header: 'Property', render: (r) => r.property ? <div><div className="cell-strong">{r.property.title}</div><div className="cell-sub">{r.property.property_type || r.property.category}</div></div> : <span className="cell-sub">All properties</span> },
    { key: 'balance', header: 'Balance', render: (r) => money(r.current_balance) },
    { key: 'deposit', header: 'Deposit Held', render: (r) => tab === 'tenant' ? money(r.deposit_held) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Folios" desc="Tenant and landlord folios with balances, deposits, invoices, payments, and deductions."
        actions={<div className="wrap-gap"><Settings size={16} /><Select value={settings.folio_mode} onChange={(e) => saveMode(e.target.value)}><option value="one_folio_per_landlord_property">One landlord folio per property</option><option value="one_folio_per_landlord">One landlord folio across all properties</option></Select></div>} />
      <div className="tabs"><div className={`tab ${tab === 'tenant' ? 'active' : ''}`} onClick={() => setTab('tenant')}>Tenant Folios</div><div className={`tab ${tab === 'landlord' ? 'active' : ''}`} onClick={() => setTab('landlord')}>Landlord Folios</div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={open} /></div>
      {detail && (
        <Drawer title={detail.loading ? 'Folio' : detail.data?.folio_code} onClose={() => setDetail(null)} width={720}>
          {detail.loading ? <Spinner /> : <>
            <div className="wrap-gap" style={{ marginBottom: 12 }}><Badge tone="blue">{detail.data.folio_type}</Badge><StatusBadge status={detail.data.status} /></div>
            <KV k="Contact" v={detail.data.contact?.full_name} /><KV k="Property" v={detail.data.property?.title || 'All properties'} /><KV k="Current balance" v={money(detail.data.current_balance)} />
            {detail.data.folio_type === 'tenant' && <><KV k="Security deposit held" v={money(detail.data.deposit_held)} /><KV k="Deposit available" v={money(detail.data.deposit_available)} /></>}
            <div className="form-section-title">Recent transactions</div>
            <table className="tbl"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Provider</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>{(detail.transactions || []).map((t) => <tr key={t.id}><td>{t.transaction_date}</td><td>{t.description}</td><td>{t.category?.name || '—'}</td><td>{t.provider?.company_name || '—'}</td><td>{money(t.debit)}</td><td>{money(t.credit)}</td><td>{money(t.balance_after)}</td></tr>)}</tbody></table>
          </>}
        </Drawer>
      )}
    </>
  );
}
