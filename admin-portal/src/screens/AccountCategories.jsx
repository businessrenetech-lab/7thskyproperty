import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Drawer, Field, Input, Select, Spinner } from '../ui/kit';

const emptyForm = { name: '', code: '', type: 'income', applies_to: 'both', default_tax_rate: 0, is_billable_to_tenant: false, is_deductible_from_landlord: false, is_active: true };

export default function AccountCategories() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/account-categories?active=false'); setRows(data.data || []); }
    catch { toast.error('Failed to load account categories'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setDrawer('edit'); };
  const openEdit = (row) => { setForm(row); setDrawer('edit'); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (form.id) await api.put(`/account-categories/${form.id}`, form);
      else await api.post('/account-categories', form);
      toast.success('Account category saved');
      setDrawer(null);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'name', header: 'Category', render: (r) => <div><div className="cell-strong">{r.name}</div><div className="cell-sub">{r.code || 'No code'}</div></div> },
    { key: 'type', header: 'Type', render: (r) => String(r.type).replace('_', ' ') },
    { key: 'applies_to', header: 'Applies To', render: (r) => String(r.applies_to).replace('_', ' ') },
    { key: 'default_tax_rate', header: 'VAT/GST', render: (r) => `${Number(r.default_tax_rate || 0)}%` },
    { key: 'flags', header: 'Rules', render: (r) => [r.is_billable_to_tenant && 'Tenant billable', r.is_deductible_from_landlord && 'Landlord deductible'].filter(Boolean).join(' · ') || '—' },
    { key: 'active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
  ];

  return (
    <>
      <PageHead title="Account Categories" desc="Admin-managed categories for tenant invoices, landlord deductions, provider bills, and VAT defaults." actions={<Button icon={Plus} onClick={openCreate}>New Category</Button>} />
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openEdit} /></div>
      {drawer === 'edit' && (
        <Drawer title={form.id ? 'Edit Account Category' : 'New Account Category'} onClose={() => setDrawer(null)} width={560}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button icon={Edit} onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}>
          <div className="form-grid">
            <Field label="Name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Maintenance" /></Field>
            <Field label="Code"><Input value={form.code || ''} onChange={(e) => set('code', e.target.value)} placeholder="MAINT" /></Field>
            <Field label="Type"><Select value={form.type} onChange={(e) => set('type', e.target.value)}>{['income', 'expense', 'asset', 'liability', 'equity'].map((v) => <option key={v} value={v}>{v}</option>)}</Select></Field>
            <Field label="Applies to"><Select value={form.applies_to} onChange={(e) => set('applies_to', e.target.value)}>{['tenant', 'landlord', 'provider', 'both'].map((v) => <option key={v} value={v}>{v}</option>)}</Select></Field>
            <Field label="Default VAT/GST rate"><Input type="number" value={form.default_tax_rate || 0} onChange={(e) => set('default_tax_rate', e.target.value)} /></Field>
            <Field label="Status"><Select value={form.is_active ? 'active' : 'inactive'} onChange={(e) => set('is_active', e.target.value === 'active')}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
          </div>
          <label className="check-row"><input type="checkbox" checked={!!form.is_billable_to_tenant} onChange={(e) => set('is_billable_to_tenant', e.target.checked)} /> Billable to tenant by default</label>
          <label className="check-row"><input type="checkbox" checked={!!form.is_deductible_from_landlord} onChange={(e) => set('is_deductible_from_landlord', e.target.checked)} /> Deductible from landlord by default</label>
        </Drawer>
      )}
    </>
  );
}
