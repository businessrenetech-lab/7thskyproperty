import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, Drawer, Field, Input, Select, Textarea, Button, Spinner, StatusBadge, Badge, SearchInput } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => (v == null || v === '' ? '—' : '৳' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const text = (v) => (v == null || v === '' ? '—' : String(v).replace(/_/g, ' '));

const COMMON = {
  property_id: { label: 'Property', type: 'property' },
  tenancy_id: { label: 'Tenancy ID', type: 'number' },
  tenant_contact_id: { label: 'Tenant Contact ID', type: 'number' },
  owner_contact_id: { label: 'Owner Contact ID', type: 'number' },
  notes: { label: 'Notes', type: 'textarea', full: true },
};

const CONFIGS = {
  utilities: {
    title: 'Utility & Bills', desc: 'Track electricity, gas, water, internet and building-charge responsibility, evidence and payment status.', endpoint: '/utility-bills', code: 'utility_code',
    createLabel: 'Add Utility Bill',
    defaults: { utility_type: 'electricity', responsibility: 'tenant', paid_by: 'tbc', payment_status: 'pending' },
    fields: ['property_id', 'tenancy_id', 'tenant_contact_id', 'owner_contact_id', 'utility_type', 'responsibility', 'provider', 'bill_period', 'amount', 'due_date', 'paid_by', 'payment_status', 'evidence_url', 'notes'],
    meta: {
      ...COMMON,
      utility_type: { label: 'Utility Type', type: 'select', options: ['electricity', 'gas', 'water', 'internet', 'building_charge', 'other'] },
      responsibility: { label: 'Responsibility', type: 'select', options: ['tenant', 'owner', 'shared', 'seventh_sky', 'tbc'] },
      provider: { label: 'Provider' }, bill_period: { label: 'Bill Period' }, amount: { label: 'Amount', type: 'number' }, due_date: { label: 'Due Date', type: 'date' },
      paid_by: { label: 'Paid By', type: 'select', options: ['tenant', 'owner', 'seventh_sky', 'tbc'] }, payment_status: { label: 'Payment Status', type: 'select', options: ['pending', 'paid', 'overdue', 'waived', 'disputed'] }, evidence_url: { label: 'Evidence URL', full: true },
    },
    columns: ['utility_code', 'property', 'utility_type', 'bill_period', 'amount', 'due_date', 'payment_status'],
  },
  requests: {
    title: 'Tenant Requests', desc: 'Manage tenant support requests across maintenance, utilities, move-in, billing, complaints and documents.', endpoint: '/tenant-requests', code: 'request_code',
    createLabel: 'Add Tenant Request',
    defaults: { request_type: 'general', priority: 'medium', status: 'open', request_date: new Date().toISOString().slice(0, 10) },
    fields: ['property_id', 'tenancy_id', 'tenant_contact_id', 'work_order_id', 'request_date', 'request_type', 'details', 'priority', 'assigned_to', 'owner_approval_required', 'status', 'resolution_notes'],
    meta: {
      ...COMMON,
      work_order_id: { label: 'Work Order ID', type: 'number' }, request_date: { label: 'Request Date', type: 'date' }, request_type: { label: 'Request Type', type: 'select', options: ['maintenance', 'utility', 'move_in', 'billing', 'complaint', 'document', 'general'] },
      details: { label: 'Details', type: 'textarea', full: true }, priority: { label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] }, assigned_to: { label: 'Assigned User ID', type: 'number' },
      owner_approval_required: { label: 'Owner Approval Required', type: 'checkbox' }, status: { label: 'Status', type: 'select', options: ['open', 'in_progress', 'waiting_owner', 'waiting_tenant', 'resolved', 'closed', 'cancelled'] }, resolution_notes: { label: 'Resolution Notes', type: 'textarea', full: true },
    },
    columns: ['request_code', 'property', 'request_type', 'priority', 'request_date', 'status'],
  },
  arrears: {
    title: 'Arrears Actions', desc: 'Persist rent reminder stages, notices, escalation level and collection actions beyond calculated ledger balances.', endpoint: '/arrears-actions', code: 'arrears_code',
    createLabel: 'Add Arrears Action',
    defaults: { reminder_stage: 'none', escalation_level: 'monitor', status: 'open' },
    fields: ['property_id', 'tenant_contact_id', 'owner_contact_id', 'rental_ledger_id', 'due_date', 'amount_due', 'amount_received', 'outstanding_amount', 'days_overdue', 'reminder_stage', 'reminder_sent_at', 'notice_issued', 'escalation_level', 'action_required', 'status', 'notes'],
    meta: {
      ...COMMON,
      rental_ledger_id: { label: 'Rental Ledger ID', type: 'number' }, due_date: { label: 'Due Date', type: 'date' }, amount_due: { label: 'Amount Due', type: 'number' }, amount_received: { label: 'Amount Received', type: 'number' }, outstanding_amount: { label: 'Outstanding', type: 'number' }, days_overdue: { label: 'Days Overdue', type: 'number' },
      reminder_stage: { label: 'Reminder Stage', type: 'select', options: ['none', '1_7_days', '8_14_days', '15_plus_days', 'final_notice'] }, reminder_sent_at: { label: 'Reminder Sent At', type: 'datetime-local' }, notice_issued: { label: 'Notice Issued', type: 'checkbox' }, escalation_level: { label: 'Escalation Level', type: 'select', options: ['monitor', 'reminder_1', 'reminder_2', 'manager_review', 'legal_review'] }, action_required: { label: 'Action Required', full: true }, status: { label: 'Status', type: 'select', options: ['open', 'in_progress', 'resolved', 'written_off', 'closed'] },
    },
    columns: ['arrears_code', 'property', 'outstanding_amount', 'days_overdue', 'escalation_level', 'status'],
  },
  marketing: {
    title: 'Rental Marketing', desc: 'Track property marketing channels, assets, budget, enquiry generation and next actions.', endpoint: '/marketing-activities', code: 'marketing_code',
    createLabel: 'Add Marketing Activity',
    defaults: { status: 'planned' },
    fields: ['property_id', 'owner_contact_id', 'channel', 'asset_task', 'start_date', 'end_date', 'budget', 'status', 'enquiries_generated', 'inspections_booked', 'next_action', 'notes'],
    meta: { ...COMMON, channel: { label: 'Channel' }, asset_task: { label: 'Asset / Task', full: true }, start_date: { label: 'Start Date', type: 'date' }, end_date: { label: 'End Date', type: 'date' }, budget: { label: 'Budget', type: 'number' }, status: { label: 'Status', type: 'select', options: ['planned', 'active', 'paused', 'completed', 'cancelled'] }, enquiries_generated: { label: 'Enquiries Generated', type: 'number' }, inspections_booked: { label: 'Inspections Booked', type: 'number' }, next_action: { label: 'Next Action', full: true } },
    columns: ['marketing_code', 'property', 'channel', 'budget', 'enquiries_generated', 'inspections_booked', 'status'],
  },
  expenses: {
    title: 'Expense Approvals', desc: 'Track owner approvals for maintenance, cleaning, emergency repairs and rent deductions.', endpoint: '/expense-approvals', code: 'expense_code',
    createLabel: 'Add Expense Approval',
    defaults: { owner_approval_required: true, deduct_from_rent: true, status: 'pending' },
    fields: ['property_id', 'owner_contact_id', 'work_order_id', 'expense_type', 'description', 'estimated_amount', 'approved_amount', 'owner_approval_required', 'approval_method', 'approved_by', 'approval_date', 'invoice_received', 'deduct_from_rent', 'status', 'notes'],
    meta: { ...COMMON, work_order_id: { label: 'Work Order ID', type: 'number' }, expense_type: { label: 'Expense Type' }, description: { label: 'Description', type: 'textarea', full: true }, estimated_amount: { label: 'Estimated Amount', type: 'number' }, approved_amount: { label: 'Approved Amount', type: 'number' }, owner_approval_required: { label: 'Owner Approval Required', type: 'checkbox' }, approval_method: { label: 'Approval Method' }, approved_by: { label: 'Approved By' }, approval_date: { label: 'Approval Date', type: 'date' }, invoice_received: { label: 'Invoice Received', type: 'checkbox' }, deduct_from_rent: { label: 'Deduct From Rent', type: 'checkbox' }, status: { label: 'Status', type: 'select', options: ['pending', 'approved', 'rejected', 'invoice_received', 'deducted', 'closed'] } },
    columns: ['expense_code', 'property', 'expense_type', 'estimated_amount', 'approved_amount', 'status'],
  },
  risks: {
    title: 'Property Risks', desc: 'Track arrears, damage, false information, subletting, cost disputes, tax liability and other controls.', endpoint: '/property-risks', code: 'risk_code',
    createLabel: 'Add Risk',
    defaults: { likelihood: 'medium', impact: 'medium', risk_rating: 'medium', status: 'open' },
    fields: ['property_id', 'tenancy_id', 'tenant_contact_id', 'owner_contact_id', 'risk_category', 'description', 'likelihood', 'impact', 'risk_rating', 'mitigation', 'owner_user_id', 'review_date', 'status'],
    meta: { ...COMMON, risk_category: { label: 'Risk Category' }, description: { label: 'Description', type: 'textarea', full: true }, likelihood: { label: 'Likelihood', type: 'select', options: ['low', 'medium', 'high'] }, impact: { label: 'Impact', type: 'select', options: ['low', 'medium', 'high'] }, risk_rating: { label: 'Risk Rating', type: 'select', options: ['low', 'medium', 'high', 'critical'] }, mitigation: { label: 'Mitigation / Control', type: 'textarea', full: true }, owner_user_id: { label: 'Owner User ID', type: 'number' }, review_date: { label: 'Review Date', type: 'date' }, status: { label: 'Status', type: 'select', options: ['open', 'monitoring', 'mitigated', 'closed'] } },
    columns: ['risk_code', 'property', 'risk_category', 'risk_rating', 'review_date', 'status'],
  },
};

function renderCell(row, key) {
  if (key === 'property') return row.property ? <div><div className="cell-strong">{row.property.title}</div><div className="cell-sub">{row.property.property_code}</div></div> : '—';
  if (key.includes('status')) return <StatusBadge status={row[key]} />;
  if (key === 'risk_rating') return <Badge tone={row.risk_rating === 'critical' || row.risk_rating === 'high' ? 'red' : row.risk_rating === 'medium' ? 'amber' : 'green'}>{text(row.risk_rating)}</Badge>;
  if (key.includes('amount') || key === 'budget' || key === 'outstanding_amount') return money(row[key]);
  return text(row[key]);
}

function ControlScreen({ type }) {
  const cfg = CONFIGS[type];
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(cfg.defaults || {});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`${cfg.endpoint}${q}`);
      setRows(data.data || []);
    } catch { toast.error(`Failed to load ${cfg.title.toLowerCase()}`); }
    finally { setLoading(false); }
  }, [cfg, search, toast]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => cfg.columns.map((key) => ({ key, header: text(key), render: (row) => renderCell(row, key) })), [cfg]);
  const openCreate = () => { setForm(cfg.defaults || {}); setSelected(null); setShowCreate(true); };
  const openEdit = (row) => { setSelected(row); setForm(cfg.fields.reduce((a, f) => ({ ...a, [f]: row[f] ?? (cfg.defaults || {})[f] ?? '' }), {})); setShowCreate(true); };
  const save = async () => {
    setSaving(true);
    try {
      if (selected) await api.put(`${cfg.endpoint}/${selected.id}`, form);
      else await api.post(cfg.endpoint, form);
      toast.success(selected ? 'Record updated' : 'Record created');
      setShowCreate(false); setSelected(null); await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHead title={cfg.title} desc={cfg.desc} actions={<><Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button><Button icon={Plus} onClick={openCreate}>{cfg.createLabel}</Button></>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad" style={{ padding: 14 }}><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openEdit} /></div>
      {showCreate && <RecordDrawer cfg={cfg} form={form} setForm={setForm} title={selected ? `${cfg.title} · ${selected[cfg.code]}` : cfg.createLabel} saving={saving} onClose={() => setShowCreate(false)} onSave={save} />}
    </>
  );
}

function RecordDrawer({ cfg, form, setForm, title, saving, onClose, onSave }) {
  return (
    <Drawer title={title} width={680} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}>
      <div className="form-grid">
        {cfg.fields.map((field) => {
          const meta = cfg.meta[field] || { label: text(field) };
          const value = form[field] ?? '';
          const update = (v) => setForm((s) => ({ ...s, [field]: v }));
          return (
            <Field key={field} label={meta.label} full={meta.full}>
              {meta.type === 'property' ? <Combo endpoint="/properties?listing_type=rent" labelFn={(p) => `${p.title} · ${p.property_code}`} value={value || null} onChange={update} placeholder="Select property…" />
                : meta.type === 'textarea' ? <Textarea value={value} onChange={(e) => update(e.target.value)} />
                : meta.type === 'select' ? <Select value={value} onChange={(e) => update(e.target.value)}>{meta.options.map((o) => <option key={o} value={o}>{text(o)}</option>)}</Select>
                : meta.type === 'checkbox' ? <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={!!value} onChange={(e) => update(e.target.checked)} /> Yes</label>
                : <Input type={meta.type || 'text'} value={value} onChange={(e) => update(e.target.value)} />}
            </Field>
          );
        })}
      </div>
    </Drawer>
  );
}

export const UtilityBills = () => <ControlScreen type="utilities" />;
export const TenantRequests = () => <ControlScreen type="requests" />;
export const ArrearsActions = () => <ControlScreen type="arrears" />;
export const MarketingActivities = () => <ControlScreen type="marketing" />;
export const ExpenseApprovals = () => <ControlScreen type="expenses" />;
export const PropertyRisks = () => <ControlScreen type="risks" />;
