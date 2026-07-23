import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Receipt, Wallet } from 'lucide-react';
import api from '../services/api';
import { Button, Select, Spinner, StatusBadge } from '../ui/kit';

const money = (value) => '৳' + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (value) => String(value || 'transaction').replace(/_/g, ' ');

export default function PropertyTransactions({ propertyId, tenancies = [] }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ owner_held: 0, tenant_balance: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ tenancy_id: '', folio_type: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filters.tenancy_id) params.set('tenancy_id', filters.tenancy_id);
      if (filters.folio_type) params.set('folio_type', filters.folio_type);
      const { data } = await api.get(`/properties/${propertyId}/transactions?${params}`);
      setRows(data.data || []);
      setSummary(data.summary || { owner_held: 0, tenant_balance: 0 });
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {
      setRows([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters, page, propertyId]);

  useEffect(() => { load(); }, [load]);

  const changeFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pm-kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <div className="pm-kpi pm-kpi--navy"><div className="top"><span className="lab">Owner balance held by us</span></div><div className="val pm-num" style={{ fontSize: 20 }}>{money(summary.owner_held)}</div><div className="pm-kpi-label">Property-attributed net balance</div></div>
        <div className="pm-kpi"><div className="top"><span className="lab">Tenant folio balance</span></div><div className="val pm-num" style={{ fontSize: 20 }}>{money(summary.tenant_balance)}</div><div className="pm-kpi-label">Charges less payments and credits</div></div>
        <div className="pm-kpi pm-kpi--cyan"><div className="top"><span className="lab">Transactions</span></div><div className="val pm-num" style={{ fontSize: 20 }}>{pagination.total}</div><div className="pm-kpi-label">Active and historical tenancies</div></div>
      </div>

      <div className="pm-card">
        <div className="pm-card-h" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="ic"><Receipt size={16} /></div><h3 style={{ flex: 1 }}>Property transactions</h3>
          <Select value={filters.tenancy_id} onChange={(event) => changeFilter('tenancy_id', event.target.value)} style={{ width: 230 }}>
            <option value="">All tenancies</option>
            {tenancies.map((tenancy) => <option key={tenancy.id} value={tenancy.id}>{tenancy.tenancy_code} · {tenancy.tenant?.full_name || 'Tenant'} · {label(tenancy.status)}</option>)}
          </Select>
          <Select value={filters.folio_type} onChange={(event) => changeFilter('folio_type', event.target.value)} style={{ width: 170 }}>
            <option value="">All ledger sides</option>
            <option value="tenant">Tenant ledger</option>
            <option value="landlord">Owner held</option>
          </Select>
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
        </div>
        {loading ? <div style={{ padding: 36, textAlign: 'center' }}><Spinner /></div> : rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="pm-tbl">
              <thead><tr><th>Date</th><th>Tenancy / tenant</th><th>Ledger</th><th>Transaction</th><th>Reference</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td><div className="cell-strong">{new Date(row.paid_at || row.transaction_date || row.created_at).toLocaleDateString()}</div><div className="cell-sub">{row.paid_at ? 'Payment date' : 'Posted date'}</div></td>
                  <td><div className="cell-strong">{row.tenant_name || 'No tenant linked'}</div><div className="cell-sub">{row.tenancy_code || 'Property-level'}{row.tenancy_status ? ` · ${label(row.tenancy_status)}` : ''}</div></td>
                  <td><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><StatusBadge status={row.folio_type} /><span className="cell-sub">{row.folio_code}</span></div></td>
                  <td><div className="cell-strong" style={{ textTransform: 'capitalize' }}>{label(row.transaction_type)} · {label(row.bucket)}</div><div className="cell-sub">{row.description || row.invoice_title || '—'}</div></td>
                  <td><div className="cell-strong">{row.payment_code || row.invoice_code || '—'}</div><div className="cell-sub">{row.payment_method ? label(row.payment_method) : ''}{row.payment_reference ? ` · ${row.payment_reference}` : ''}</div></td>
                  <td style={{ textAlign: 'right' }}><span className="pm-money">{Number(row.debit) ? money(row.debit) : '—'}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="pm-money-out">{Number(row.credit) ? money(row.credit) : '—'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="pm-empty"><div className="ic"><Wallet size={22} /></div>No transactions found for these filters.</div>}
        {pagination.pages > 1 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--line)' }}><span className="cell-sub">Page {pagination.page} of {pagination.pages}</span><div style={{ display: 'flex', gap: 8 }}><Button size="sm" variant="ghost" icon={ArrowLeft} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="ghost" icon={ArrowRight} disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
      </div>
    </div>
  );
}
