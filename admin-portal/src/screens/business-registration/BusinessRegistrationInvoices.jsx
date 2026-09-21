import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, HandCoins, Layers } from 'lucide-react';
import api from '../../services/api';
import { PageHead, Badge, DataTable, SearchInput, Select, StatCard } from '../../ui/kit';
import { money } from './constants';

const INV_STATUS_TONE = { draft: 'grey', sent: 'blue', partial: 'amber', paid: 'green', void: 'red' };

export default function BusinessRegistrationInvoices() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/business-registration-invoices', { params: status ? { status } : {} }).then((r) => setRows(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
    api.get('/business-registration-invoices/stats').then((r) => setStats(r.data.data)).catch(() => {});
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const filtered = search ? rows.filter((r) => `${r.invoice_code} ${r.client_name || ''} ${r.project?.project_code || ''}`.toLowerCase().includes(search.toLowerCase())) : rows;

  const columns = [
    { key: 'invoice_code', header: 'Invoice', render: (r) => <div><div style={{ fontWeight: 700 }}>{r.invoice_code}</div><div style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{r.invoice_type}</div></div> },
    { key: 'project', header: 'Project', render: (r) => <div>{r.project?.project_code || '—'}<div style={{ fontSize: 12, color: '#6b7280' }}>{r.client_name || r.project?.client_name || ''}</div></div> },
    { key: 'total_amount', header: 'Total', tdStyle: { textAlign: 'right' }, render: (r) => money(r.total_amount) },
    { key: 'paid_amount', header: 'Paid', tdStyle: { textAlign: 'right' }, render: (r) => money(r.paid_amount) },
    { key: 'balance', header: 'Balance', tdStyle: { textAlign: 'right' }, render: (r) => money(Number(r.total_amount) - Number(r.paid_amount)) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={INV_STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge> },
  ];

  return (
    <div className="pm-scope">
      <PageHead title="Registration Invoices" desc="Deposit / progress / final / provider invoices — scoped to Business Registration only." />
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard icon={Receipt} label="Invoiced" value={money(stats.total_invoiced)} tone="blue" />
          <StatCard icon={HandCoins} label="Collected" value={money(stats.total_collected)} tone="green" />
          <StatCard icon={Layers} label="Outstanding" value={money(stats.outstanding)} tone={stats.outstanding > 0 ? 'red' : 'green'} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 14px', alignItems: 'center' }}>
        <div style={{ minWidth: 240 }}><SearchInput value={search} onChange={setSearch} placeholder="Search invoices, clients, projects…" /></div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          {['draft', 'sent', 'partial', 'paid', 'void'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={(r) => r.project_id && nav(`/business-registration/projects/${r.project_id}`)} />
    </div>
  );
}
