import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, Drawer, Field, Input, Textarea, Spinner, StatusBadge } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const num = (v) => Number(v || 0);
const landlordLabel = (f) => `${f.contact?.full_name || f.owner?.full_name || f.folio_code} · ${f.property?.title || 'All properties'}`;
const tenancyLabel = (t) => `${t.tenant?.full_name || 'Tenant'} · ${t.Property?.title || t.property?.title || t.tenancy_code || ''}`;

export default function LandlordBills() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/billing/landlord-bills?limit=100'); setRows(data.data || []); } catch { toast.error('Failed to load landlord bills'); } finally { setLoading(false); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  const openCreate = () => setForm({ landlord_folio_id: null, bill_account_id: null, provider_id: null, description: '', full_bill_amount: '', tenant_pays_part: false, tenant_tenancy_id: null, tenant_amount: '', tenant_due_date: '', tenant_invoice_account_id: null, tenant_invoice_description: '', due_date: '', uploaded_bill_url: '' }) || setDrawer('create');
  const create = async () => {
    if (!form.landlord_folio_id) return toast.error('Select landlord first');
    if (!form.bill_account_id) return toast.error('Bill account is required');
    if (!form.provider_id) return toast.error('Provider is required');
    if (!form.description) return toast.error('Description is required');
    if (!num(form.full_bill_amount)) return toast.error('Full bill amount is required');
    setSaving(true);
    try { await api.post('/billing/landlord-bills', form); toast.success('Landlord bill created'); setDrawer(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); }
    finally { setSaving(false); }
  };
  const columns = [
    { key: 'bill_code', header: 'Bill', render: (r) => <span className="code-chip">{r.bill_code}</span> },
    { key: 'landlord', header: 'Landlord', render: (r) => r.landlord?.full_name || '—' },
    { key: 'account', header: 'Bill Account', render: (r) => r.billAccount?.name || '—' },
    { key: 'provider', header: 'Provider', render: (r) => r.provider?.company_name || '—' },
    { key: 'amount', header: 'Full Bill Amount', render: (r) => money(r.full_bill_amount) },
    { key: 'tenant', header: 'Tenant Part', render: (r) => r.tenant_pays_part ? money(r.tenant_amount) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];
  return <>
    <PageHead title="Landlord Bills" desc="Provider bills deduct from landlord balance. Optional tenant part automatically creates tenant invoice." actions={<Button icon={Plus} onClick={openCreate}>New Landlord Bill</Button>} />
    <div className="card"><DataTable columns={columns} rows={rows} loading={loading} /></div>
    {drawer === 'create' && form && <Drawer title="New Landlord Bill" onClose={() => setDrawer(null)} width={660} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : `Create · ${money(form.full_bill_amount)}`}</Button></>}>
      <Field label="Select Landlord" required full><Combo endpoint="/folios?type=landlord" labelFn={landlordLabel} value={form.landlord_folio_id} onChange={(v) => setForm({ ...form, landlord_folio_id: v })} placeholder="Search landlord folio…" /></Field>
      <Field label="Bill Account" required full><Combo endpoint="/account-categories?applies_to=landlord" labelFn={(c) => c.name} value={form.bill_account_id} onChange={(v) => setForm({ ...form, bill_account_id: v })} placeholder="Select bill account…" /></Field>
      <Field label="Provider" required full><Combo endpoint="/providers" labelFn={(p) => p.company_name} value={form.provider_id} onChange={(v) => setForm({ ...form, provider_id: v })} placeholder="Select provider…" /></Field>
      <Field label="Description" required full><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="form-grid"><Field label="Full Bill Amount" required><Input type="number" value={form.full_bill_amount} onChange={(e) => setForm({ ...form, full_bill_amount: e.target.value })} /></Field><Field label="Due Date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field></div>
      <label className="check-row"><input type="checkbox" checked={!!form.tenant_pays_part} onChange={(e) => setForm({ ...form, tenant_pays_part: e.target.checked })} /> Tenant has to pay part of this bill</label>
      {form.tenant_pays_part && <><Field label="Tenant" required full><Combo endpoint="/tenancies" labelFn={tenancyLabel} value={form.tenant_tenancy_id} onChange={(v) => setForm({ ...form, tenant_tenancy_id: v })} placeholder="Select tenant…" /></Field><div className="form-grid"><Field label="Tenant Amount" required><Input type="number" value={form.tenant_amount} onChange={(e) => setForm({ ...form, tenant_amount: e.target.value })} /></Field><Field label="Tenant Due Date"><Input type="date" value={form.tenant_due_date} onChange={(e) => setForm({ ...form, tenant_due_date: e.target.value })} /></Field></div><Field label="Invoice Account" required full><Combo endpoint="/account-categories?applies_to=tenant" labelFn={(c) => c.name} value={form.tenant_invoice_account_id} onChange={(v) => setForm({ ...form, tenant_invoice_account_id: v })} placeholder="Select tenant invoice account…" /></Field><Field label="Tenant Invoice Description" full><Textarea value={form.tenant_invoice_description} onChange={(e) => setForm({ ...form, tenant_invoice_description: e.target.value })} /></Field></>}
      <Field label="Upload Bill" full><Input value={form.uploaded_bill_url} onChange={(e) => setForm({ ...form, uploaded_bill_url: e.target.value })} placeholder="Paste uploaded PDF/image URL" /></Field>
    </Drawer>}
  </>;
}
