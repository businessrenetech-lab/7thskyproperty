import React, { useState } from 'react';
import { FileText, Play } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, Field, Input, Spinner, Badge } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function GlobalInvoicing() {
  const toast = useToast();
  const [period, setPeriod] = useState(thisPeriod());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const preview = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/tenancies/global-invoices?period_label=${period}`); setRows(data.data || []); }
    catch { toast.error('Preview failed'); }
    finally { setLoading(false); }
  };
  const generate = async () => {
    setRunning(true);
    try { const { data } = await api.post('/tenancies/global-invoices', { period_label: period }); toast.success(data.message || 'Invoices generated'); preview(); }
    catch (e) { toast.error(e.response?.data?.error || 'Generation failed'); }
    finally { setRunning(false); }
  };

  const columns = [
    { key: 'tenancy_code', header: 'Tenancy', render: (r) => <span className="code-chip">{r.tenancy_code}</span> },
    { key: 'property', header: 'Property', render: (r) => <div><div className="cell-strong">{r.property?.title || '—'}</div><div className="cell-sub">{r.property?.property_type || r.property?.category || ''}</div></div> },
    { key: 'tenant', header: 'Tenant', render: (r) => r.tenant?.full_name || '—' },
    { key: 'rent', header: 'Rent', render: (r) => money(r.rent) },
    { key: 'service', header: 'Service Charge', render: (r) => money(r.service_charge) },
    { key: 'total', header: 'Total', render: (r) => money(r.total) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'ready' ? 'green' : r.status === 'already_exists' ? 'amber' : 'red'}>{r.status.replace('_', ' ')}</Badge> },
  ];

  return (
    <>
      <PageHead title="Global Tenant Invoicing" desc="Preview and generate monthly tenant invoices across all active tenancies. Invoices post to tenant folios automatically." actions={<Button icon={Play} onClick={generate} disabled={running || !rows.some((r) => r.status === 'ready')}>{running ? <Spinner /> : 'Generate Ready Invoices'}</Button>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad form-grid" style={{ alignItems: 'end' }}><Field label="Invoice period"><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></Field><Button icon={FileText} onClick={preview}>Preview</Button></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} /></div>
    </>
  );
}
