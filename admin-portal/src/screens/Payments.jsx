import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, Badge } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

export default function Payments() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [dir, setDir] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const p = new URLSearchParams({ limit: 100 }); if (dir) p.set('direction', dir); const { data } = await api.get(`/payments?${p}`); setRows(data.data || []); }
    catch { toast.error('Failed to load payments'); } finally { setLoading(false); }
  }, [dir, toast]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'payment_code', header: 'Payment', render: (r) => <span className="code-chip">{r.payment_code}</span> },
    { key: 'invoice', header: 'Invoice', render: (r) => r.PropertyInvoice?.invoice_code || '—' },
    { key: 'direction', header: 'Direction', render: (r) => <Badge tone={r.direction === 'incoming' ? 'green' : 'amber'}>{r.direction}</Badge> },
    { key: 'method', header: 'Method', render: (r) => r.method?.replace('_', ' ') },
    { key: 'amount', header: 'Amount', render: (r) => <span className="cell-strong">{money(r.amount)}</span> },
    { key: 'paid_at', header: 'Date', render: (r) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
  ];

  return (
    <>
      <PageHead title="Payments" desc="All incoming (client) and outgoing (provider/owner) payments." />
      <div className="tabs">
        <div className={`tab ${dir === '' ? 'active' : ''}`} onClick={() => setDir('')}>All</div>
        <div className={`tab ${dir === 'incoming' ? 'active' : ''}`} onClick={() => setDir('incoming')}>Incoming</div>
        <div className={`tab ${dir === 'outgoing' ? 'active' : ''}`} onClick={() => setDir('outgoing')}>Outgoing</div>
      </div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} /></div>
    </>
  );
}
