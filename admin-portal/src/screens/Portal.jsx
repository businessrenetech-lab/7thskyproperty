import React, { useEffect, useState } from 'react';
import { Home, FileText, Wallet, Building2, Wrench, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { PageHead, DataTable, StatusBadge, Badge, Spinner, EmptyState, KV } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

const invoiceCols = [
  { key: 'invoice_code', header: 'Invoice', render: (r) => <span className="code-chip">{r.invoice_code}</span> },
  { key: 'title', header: 'Title', render: (r) => r.title || '—' },
  { key: 'total', header: 'Total', render: (r) => money(r.total) },
  { key: 'balance', header: 'Balance', render: (r) => money(r.balance) },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function Portal() {
  const [d, setD] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const { data } = await api.get('/portal/dashboard'); setD(data.data); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <div style={{ padding: 48 }}><Spinner /></div>;
  if (!d) return <EmptyState title="Unable to load your portal" />;

  const { role, linked, profile, sections = {} } = d;

  return (
    <>
      <PageHead title={`Welcome, ${profile.name}`} desc={profile.code ? `Your reference: ${profile.code}` : 'Your Seventh Sky portal'} />
      {!linked && (
        <div className="card card-pad" style={{ background: 'var(--warning-bg)', marginBottom: 16 }}>
          <b>Portal access not linked yet.</b>
          <p className="cell-sub" style={{ margin: '6px 0 0' }}>Your account isn't connected to a client/provider record. Please contact Seventh Sky to enable your data.</p>
        </div>
      )}

      {role === 'tenant' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}><div className="card-head"><h3><Home size={15} /> My Tenancies</h3></div>
            <div className="card-pad">{(sections.tenancies || []).map((t) => (
              <div key={t.id} className="kv"><span className="k">{t.Property?.title || 'Property'} — {t.tenancy_code}</span><span className="v">Rent {money(t.monthly_rent)} · {t.status}</span></div>
            ))}{!(sections.tenancies || []).length && <p className="cell-sub">No tenancies.</p>}</div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}><div className="card-head"><h3><Wallet size={15} /> Rent Ledger</h3></div>
            <DataTable columns={[{ key: 'period_label', header: 'Period' }, { key: 'rent_due', header: 'Due', render: (r) => money(r.rent_due) }, { key: 'rent_received', header: 'Paid', render: (r) => money(r.rent_received) }, { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} rows={sections.ledger || []} />
          </div>
          <div className="card"><div className="card-head"><h3><FileText size={15} /> My Invoices</h3></div><DataTable columns={invoiceCols} rows={sections.invoices || []} /></div>
        </>
      )}

      {role === 'buyer' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}><div className="card-head"><h3><Building2 size={15} /> My Deals</h3></div>
            <DataTable columns={[{ key: 'deal_code', header: 'Deal', render: (r) => <span className="code-chip">{r.deal_code}</span> }, { key: 'property', header: 'Property', render: (r) => r.Property?.title || '—' }, { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} rows={sections.deals || []} />
          </div>
          <div className="card"><div className="card-head"><h3><FileText size={15} /> My Invoices</h3></div><DataTable columns={invoiceCols} rows={sections.invoices || []} /></div>
        </>
      )}

      {role === 'owner' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}><div className="card-head"><h3><Building2 size={15} /> My Properties</h3></div>
            <DataTable columns={[{ key: 'property_code', header: 'Code', render: (r) => <span className="code-chip">{r.property_code}</span> }, { key: 'title', header: 'Property' }, { key: 'area', header: 'Area' }, { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} rows={sections.properties || []} />
          </div>
          <div className="card"><div className="card-head"><h3><Wallet size={15} /> Disbursements</h3></div>
            <DataTable columns={[{ key: 'disbursement_code', header: 'Code' }, { key: 'period_start', header: 'Period' }, { key: 'net_payable', header: 'Net', render: (r) => money(r.net_payable) }, { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} rows={sections.disbursements || []} />
          </div>
        </>
      )}

      {role === 'supplier' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}><div className="card-head"><h3><Wrench size={15} /> Assigned Work Orders</h3></div>
            <DataTable columns={[{ key: 'work_order_code', header: 'WO', render: (r) => <span className="code-chip">{r.work_order_code}</span> }, { key: 'title', header: 'Title' }, { key: 'scheduled_date', header: 'Scheduled' }, { key: 'amount', header: 'Amount', render: (r) => money(r.amount) }, { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} rows={sections.work_orders || []} />
          </div>
          <div className="card"><div className="card-head"><h3><FileText size={15} /> My Invoices</h3></div><DataTable columns={invoiceCols} rows={sections.invoices || []} /></div>
        </>
      )}
    </>
  );
}
