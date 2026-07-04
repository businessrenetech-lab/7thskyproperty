import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Drawer, Field, Input, Select, Textarea, SearchInput, KV, Spinner, Badge } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const num = (v) => Number(v || 0);
const tenancyLabel = (t) => `${t.tenant?.full_name || 'Tenant'} · ${t.Property?.title || t.property?.title || t.tenancy_code || ''}`;

export default function Invoices() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(null);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pay, setPay] = useState({ amount: '', method: 'cash', reference: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/tenant-invoices?limit=100');
      const all = data.data || [];
      const q = search.toLowerCase();
      setRows(q ? all.filter((r) => `${r.invoice_code} ${r.payable_name} ${r.notes}`.toLowerCase().includes(q)) : all);
    } catch { toast.error('Failed to load tenant invoices'); }
    finally { setLoading(false); }
  }, [search, toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ tenancy_id: null, invoice_account_id: null, provider_id: null, description: '', amount: '', vat_included: false, due_date: '', uploaded_invoice_url: '' });
    setDrawer('create');
  };
  const create = async () => {
    if (!form.tenancy_id) return toast.error('Select tenant first');
    if (!form.invoice_account_id) return toast.error('Invoice account is required');
    if (!form.description) return toast.error('Description is required');
    if (!num(form.amount)) return toast.error('Invoice amount is required');
    setSaving(true);
    try { await api.post('/billing/tenant-invoices', form); toast.success('Tenant invoice created'); setDrawer(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); }
    finally { setSaving(false); }
  };
  const openView = async (r) => {
    setSel(r); setDrawer('view'); setDetail(null);
    try { const { data } = await api.get(`/invoices/${r.id}`); setDetail(data.data); }
    catch { toast.error('Load failed'); }
  };
  const recordPayment = async () => {
    if (!num(pay.amount)) return toast.error('Enter an amount');
    try { await api.post(`/invoices/${sel.id}/payments`, pay); setPay({ amount: '', method: 'cash', reference: '' }); const { data } = await api.get(`/invoices/${sel.id}`); setDetail(data.data); load(); toast.success('Payment recorded and landlord balance updated'); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const columns = [
    { key: 'invoice_code', header: 'Invoice', render: (r) => <span className="code-chip">{r.invoice_code}</span> },
    { key: 'tenant', header: 'Tenant', render: (r) => <div className="cell-strong">{r.payable_name}</div> },
    { key: 'account', header: 'Invoice Account', render: (r) => r.category?.name || '—' },
    { key: 'description', header: 'Description', render: (r) => <span className="cell-sub">{r.notes || r.title || '—'}</span> },
    { key: 'provider', header: 'Provider', render: (r) => r.provider?.company_name || '—' },
    { key: 'total', header: 'Amount', render: (r) => money(r.total) },
    { key: 'balance', header: 'Balance', render: (r) => num(r.balance) > 0 ? <Badge tone="amber">{money(r.balance)}</Badge> : <Badge tone="green">Settled</Badge> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Tenant Invoices" desc="Simple tenant billing: tenant, invoice account, provider, description, amount, VAT included, due date, upload invoice." actions={<Button icon={Plus} onClick={openCreate}>New Tenant Invoice</Button>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant invoice…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && form && (
        <Drawer title="New Tenant Invoice" onClose={() => setDrawer(null)} width={620}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : `Create · ${money(form.amount)}`}</Button></>}>
          <Field label="Select Tenant" required full><Combo endpoint="/tenancies" labelFn={tenancyLabel} value={form.tenancy_id} onChange={(v) => setForm({ ...form, tenancy_id: v })} placeholder="Search tenant / tenancy…" /></Field>
          <Field label="Invoice Account" required full><Combo endpoint="/account-categories?applies_to=tenant" labelFn={(c) => c.name} value={form.invoice_account_id} onChange={(v) => setForm({ ...form, invoice_account_id: v })} placeholder="Select invoice account…" /></Field>
          <Field label="Provider" full><Combo endpoint="/providers" labelFn={(p) => p.company_name} value={form.provider_id} onChange={(v) => setForm({ ...form, provider_id: v })} placeholder="Provider who provided the service…" /></Field>
          <Field label="Description" required full><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Simple invoice description…" /></Field>
          <div className="form-grid">
            <Field label="Invoice Amount" required><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Due Date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
          <label className="check-row"><input type="checkbox" checked={!!form.vat_included} onChange={(e) => setForm({ ...form, vat_included: e.target.checked })} /> VAT included</label>
          <Field label="Upload Invoice" full><Input value={form.uploaded_invoice_url} onChange={(e) => setForm({ ...form, uploaded_invoice_url: e.target.value })} placeholder="Paste uploaded PDF/image URL" /></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.invoice_code || 'Invoice'} onClose={() => setDrawer(null)} width={620}>
          {!detail ? <Spinner /> : <>
            <div className="wrap-gap" style={{ marginBottom: 14 }}><span className="code-chip">{detail.invoice_code}</span><StatusBadge status={detail.status} /></div>
            <KV k="Tenant" v={detail.payable_name} /><KV k="Invoice Account" v={detail.category?.name} /><KV k="Provider" v={detail.provider?.company_name} /><KV k="Description" v={detail.notes || detail.title} /><KV k="Due" v={detail.due_date} /><KV k="Uploaded invoice" v={detail.uploaded_invoice_url} />
            <KV k="Amount" v={money(detail.total)} /><KV k="Paid" v={money(detail.amount_paid)} /><KV k="Balance" v={money(detail.balance)} />
            <div className="form-section-title"><Wallet size={13} /> Payments ({detail.payments?.length || 0})</div>
            {(detail.payments || []).map((p) => <div key={p.id} className="kv"><span className="k">{p.payment_code} · {p.method}</span><span className="v">{money(p.amount)}</span></div>)}
            {detail.status !== 'paid' && <><div className="form-grid" style={{ marginTop: 10 }}><Field label="Amount"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field><Field label="Method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}</Select></Field></div><Field label="Reference" full><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field><Button icon={Wallet} onClick={recordPayment}>Record payment</Button></>}
          </>}
        </Drawer>
      )}
    </>
  );
}
