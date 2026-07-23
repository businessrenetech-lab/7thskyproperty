import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Wrench, Receipt, CalendarClock, Wallet, 
  Tags, ShieldAlert, FileText, Check, X, Info, Clock, 
  AlertCircle, ShieldCheck, HelpCircle, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Drawer, Field, Input, Select, Textarea, Button, Spinner, 
  StatusBadge, Badge 
} from '../ui/kit';

const money = (v) => (v == null || v === '' ? '৳0.00' : '৳' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const text = (v) => (v == null || v === '' ? '—' : String(v).replace(/_/g, ' '));

// ─── UTILITIES & BILLS PANEL ──────────────────────────────────────────
export function PropertyUtilitiesTab({ propertyId, ownerContactId, tenantContactId, activeTenancyId, items = [], onReload }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const defaults = { 
    utility_type: 'electricity', 
    responsibility: 'tenant', 
    paid_by: 'tbc', 
    payment_status: 'pending',
    provider: '',
    bill_period: '',
    amount: '',
    due_date: '',
    evidence_url: '',
    notes: ''
  };

  const openCreate = () => {
    setForm(defaults);
    setSelected(null);
    setShowCreate(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      utility_type: item.utility_type || 'electricity',
      responsibility: item.responsibility || 'tenant',
      provider: item.provider || '',
      bill_period: item.bill_period || '',
      amount: item.amount || '',
      due_date: item.due_date || '',
      paid_by: item.paid_by || 'tbc',
      payment_status: item.payment_status || 'pending',
      evidence_url: item.evidence_url || '',
      notes: item.notes || ''
    });
    setShowCreate(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        property_id: propertyId,
        owner_contact_id: ownerContactId,
        tenant_contact_id: tenantContactId,
        tenancy_id: activeTenancyId
      };
      if (selected) {
        await api.put(`/utility-bills/${selected.id}`, payload);
        toast.success('Utility bill record updated');
      } else {
        await api.post('/utility-bills', payload);
        toast.success('Utility bill logged successfully');
      }
      setShowCreate(false);
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save utility bill');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this utility bill record?')) return;
    try {
      await api.delete(`/utility-bills/${id}`);
      toast.success('Utility bill deleted');
      onReload();
    } catch {
      toast.error('Failed to delete utility bill');
    }
  };

  // Metrics
  const pendingAmount = items
    .filter(i => i.payment_status !== 'paid' && i.payment_status !== 'waived')
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="between">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Utility Bills Tracking</h4>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>Log and track water, electricity, gas, internet and building charges.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={openCreate}>Log Utility Bill</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card" style={{ padding: 14, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Total Outstanding Utilities</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: pendingAmount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 6 }}>
            {money(pendingAmount)}
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--primary-800)' }}>
          <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div>Note: Utility bills are logged here for operations and responsibility tracking. Formal landlord payouts and tenant invoices are generated inside the primary Invoices & Folio sheets.</div>
        </div>
      </div>

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="code-chip">{item.utility_code}</span>
                    <strong style={{ fontSize: 13.5, textTransform: 'capitalize' }}>
                      {item.utility_type} Bill
                    </strong>
                    <StatusBadge status={item.payment_status} />
                    <Badge tone={item.responsibility === 'tenant' ? 'blue' : item.responsibility === 'owner' ? 'green' : 'amber'}>
                      Resp: {text(item.responsibility)}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 16 }}>
                    {item.provider && <span>Provider: <strong>{item.provider}</strong></span>}
                    {item.bill_period && <span>Period: <strong>{item.bill_period}</strong></span>}
                    {item.due_date && <span>Due Date: <strong>{item.due_date}</strong></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{money(item.amount)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Paid By: <span style={{ textTransform: 'capitalize' }}>{item.paid_by || 'tbc'}</span></div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm btn-icon" 
                    style={{ color: 'var(--danger)' }} 
                    onClick={(e) => remove(item.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Receipt size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
          <p className="cell-sub" style={{ margin: 0 }}>No utility bills logged for this property. Click the button above to log one.</p>
        </div>
      )}

      {showCreate && (
        <Drawer 
          title={selected ? `Edit Utility Bill · ${selected.utility_code}` : 'Log Utility Bill'} 
          width={580} 
          onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Utility Type" required>
              <Select value={form.utility_type} onChange={(e) => setForm(s => ({ ...s, utility_type: e.target.value }))}>
                <option value="electricity">Electricity</option>
                <option value="gas">Gas</option>
                <option value="water">Water</option>
                <option value="internet">Internet</option>
                <option value="building_charge">Building Service Charge</option>
                <option value="other">Other Bill</option>
              </Select>
            </Field>
            <Field label="Provider Name">
              <Input value={form.provider} onChange={(e) => setForm(s => ({ ...s, provider: e.target.value }))} placeholder="e.g. DESCO, WASA, Carnival" />
            </Field>
            <Field label="Billing Period">
              <Input value={form.bill_period} onChange={(e) => setForm(s => ({ ...s, bill_period: e.target.value }))} placeholder="e.g. June 2026, Q2 2026" />
            </Field>
            <Field label="Bill Amount (৳)" required>
              <Input type="number" value={form.amount} onChange={(e) => setForm(s => ({ ...s, amount: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={form.due_date} onChange={(e) => setForm(s => ({ ...s, due_date: e.target.value }))} />
            </Field>
            <Field label="Responsibility" required>
              <Select value={form.responsibility} onChange={(e) => setForm(s => ({ ...s, responsibility: e.target.value }))}>
                <option value="tenant">Tenant Pays</option>
                <option value="owner">Owner Pays</option>
                <option value="shared">Shared Responsibility</option>
                <option value="seventh_sky">Seventh Sky (Agency)</option>
                <option value="tbc">To Be Clarified</option>
              </Select>
            </Field>
            <Field label="Paid By" required>
              <Select value={form.paid_by} onChange={(e) => setForm(s => ({ ...s, paid_by: e.target.value }))}>
                <option value="tbc">To Be Decided / TBC</option>
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
                <option value="seventh_sky">Seventh Sky Care</option>
              </Select>
            </Field>
            <Field label="Payment Status" required>
              <Select value={form.payment_status} onChange={(e) => setForm(s => ({ ...s, payment_status: e.target.value }))}>
                <option value="pending">Pending Payment</option>
                <option value="paid">Fully Paid</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
                <option value="disputed">Disputed</option>
              </Select>
            </Field>
            <Field label="Evidence Document URL" full>
              <Input value={form.evidence_url} onChange={(e) => setForm(s => ({ ...s, evidence_url: e.target.value }))} placeholder="Link to receipt image or PDF scan..." />
            </Field>
            <Field label="Operational Notes" full>
              <Textarea value={form.notes} onChange={(e) => setForm(s => ({ ...s, notes: e.target.value }))} rows={3} placeholder="Notes, reference numbers, details..." />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ─── TENANT REQUESTS PANEL ────────────────────────────────────────────
export function PropertyRequestsTab({ propertyId, tenantContactId, activeTenancyId, items = [], onReload }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const defaults = {
    request_type: 'general',
    priority: 'medium',
    status: 'open',
    request_date: new Date().toISOString().slice(0, 10),
    details: '',
    owner_approval_required: false,
    resolution_notes: '',
    work_order_id: '',
    assigned_to: ''
  };

  const openCreate = () => {
    setForm(defaults);
    setSelected(null);
    setShowCreate(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      request_type: item.request_type || 'general',
      priority: item.priority || 'medium',
      status: item.status || 'open',
      request_date: item.request_date || '',
      details: item.details || '',
      owner_approval_required: !!item.owner_approval_required,
      resolution_notes: item.resolution_notes || '',
      work_order_id: item.work_order_id || '',
      assigned_to: item.assigned_to || ''
    });
    setShowCreate(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        property_id: propertyId,
        tenant_contact_id: tenantContactId,
        tenancy_id: activeTenancyId
      };
      if (selected) {
        await api.put(`/tenant-requests/${selected.id}`, payload);
        toast.success('Tenant request updated');
      } else {
        await api.post('/tenant-requests', payload);
        toast.success('Tenant request logged');
      }
      setShowCreate(false);
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save request');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this tenant request?')) return;
    try {
      await api.delete(`/tenant-requests/${id}`);
      toast.success('Tenant request deleted');
      onReload();
    } catch {
      toast.error('Failed to delete request');
    }
  };

  const activeCount = items.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'cancelled').length;
  const criticalCount = items.filter(i => (i.priority === 'critical' || i.priority === 'high') && (i.status !== 'resolved' && i.status !== 'closed')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="between">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Tenant Support Requests</h4>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>Manage maintenance requests, complaints, and general assistance from residents.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={openCreate}>Add Tenant Request</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 14, background: 'var(--surface-2)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Active Tickets</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)', marginTop: 6 }}>
            {activeCount} Tickets
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: criticalCount > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: criticalCount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>Critical / High Priority</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: criticalCount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 6 }}>
            {criticalCount} Urgent
          </div>
        </div>
      </div>

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-pad" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="code-chip">{item.request_code}</span>
                      <strong style={{ fontSize: 14, textTransform: 'capitalize' }}>
                        {item.request_type} Request
                      </strong>
                      <StatusBadge status={item.status} />
                      <Badge tone={item.priority === 'critical' || item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'amber' : 'blue'}>
                        {item.priority}
                      </Badge>
                      {item.owner_approval_required && (
                        <Badge tone="purple" dot>Owner Approval Req.</Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                      Logged on: <strong>{item.request_date}</strong>
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm btn-icon" 
                    style={{ color: 'var(--danger)' }} 
                    onClick={(e) => remove(item.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <p style={{ margin: '10px 0 0 0', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                  {item.details}
                </p>

                {item.resolution_notes && (
                  <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
                    <strong>Resolution Notes:</strong> {item.resolution_notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Wrench size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
          <p className="cell-sub" style={{ margin: 0 }}>No tenant requests logged. Click the button above to add one.</p>
        </div>
      )}

      {showCreate && (
        <Drawer 
          title={selected ? `Edit Tenant Request · ${selected.request_code}` : 'Add Tenant Request'} 
          width={580} 
          onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Request Date" required>
              <Input type="date" value={form.request_date} onChange={(e) => setForm(s => ({ ...s, request_date: e.target.value }))} />
            </Field>
            <Field label="Request Category" required>
              <Select value={form.request_type} onChange={(e) => setForm(s => ({ ...s, request_type: e.target.value }))}>
                <option value="general">General Support</option>
                <option value="maintenance">Maintenance & Repairs</option>
                <option value="utility">Utilities & Bills</option>
                <option value="move_in">Move-in/Move-out Coordination</option>
                <option value="billing">Invoicing & Billing</option>
                <option value="complaint">Complaint</option>
                <option value="document">Documentation & Signings</option>
              </Select>
            </Field>
            <Field label="Priority Level" required>
              <Select value={form.priority} onChange={(e) => setForm(s => ({ ...s, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
            <Field label="Ticket Status" required>
              <Select value={form.status} onChange={(e) => setForm(s => ({ ...s, status: e.target.value }))}>
                <option value="open">Open / New</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_owner">Waiting on Owner Approval</option>
                <option value="waiting_tenant">Waiting on Tenant Response</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
            <Field label="Work Order ID (if linked)">
              <Input type="number" value={form.work_order_id} onChange={(e) => setForm(s => ({ ...s, work_order_id: e.target.value }))} placeholder="e.g. 23" />
            </Field>
            <Field label="Assigned User ID">
              <Input type="number" value={form.assigned_to} onChange={(e) => setForm(s => ({ ...s, assigned_to: e.target.value }))} placeholder="e.g. 5" />
            </Field>
            <Field label="Owner Approval Required?" full>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={form.owner_approval_required} onChange={(e) => setForm(s => ({ ...s, owner_approval_required: e.target.checked }))} />
                Yes, this requires the owner's confirmation (e.g. high-cost repair)
              </label>
            </Field>
            <Field label="Request Description / Details" required full>
              <Textarea value={form.details} onChange={(e) => setForm(s => ({ ...s, details: e.target.value }))} rows={4} placeholder="Describe the tenant's issue or request..." />
            </Field>
            <Field label="Resolution / Actions Taken" full>
              <Textarea value={form.resolution_notes} onChange={(e) => setForm(s => ({ ...s, resolution_notes: e.target.value }))} rows={3} placeholder="Add notes on how this request was or will be resolved..." />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ─── EXPENSE APPROVALS PANEL ──────────────────────────────────────────
export function PropertyExpensesTab({ propertyId, ownerContactId, items = [], onReload }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const defaults = {
    expense_type: '',
    description: '',
    estimated_amount: '',
    approved_amount: '',
    owner_approval_required: true,
    approval_method: 'whatsapp',
    approved_by: '',
    approval_date: '',
    invoice_received: false,
    deduct_from_rent: true,
    status: 'pending',
    work_order_id: '',
    notes: ''
  };

  const openCreate = () => {
    setForm(defaults);
    setSelected(null);
    setShowCreate(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      expense_type: item.expense_type || '',
      description: item.description || '',
      estimated_amount: item.estimated_amount || '',
      approved_amount: item.approved_amount || '',
      owner_approval_required: !!item.owner_approval_required,
      approval_method: item.approval_method || 'whatsapp',
      approved_by: item.approved_by || '',
      approval_date: item.approval_date || '',
      invoice_received: !!item.invoice_received,
      deduct_from_rent: !!item.deduct_from_rent,
      status: item.status || 'pending',
      work_order_id: item.work_order_id || '',
      notes: item.notes || ''
    });
    setShowCreate(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        property_id: propertyId,
        owner_contact_id: ownerContactId
      };
      if (selected) {
        await api.put(`/expense-approvals/${selected.id}`, payload);
        toast.success('Expense approval updated');
      } else {
        await api.post('/expense-approvals', payload);
        toast.success('Expense approval logged');
      }
      setShowCreate(false);
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await api.delete(`/expense-approvals/${id}`);
      toast.success('Expense approval deleted');
      onReload();
    } catch {
      toast.error('Failed to delete expense record');
    }
  };

  // Direct Approval action
  const handleDirectApprove = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`Quick Approve this expense for ৳${item.estimated_amount}?`)) return;
    try {
      const payload = {
        ...item,
        status: 'approved',
        approved_amount: item.estimated_amount,
        approved_by: 'Staff Care',
        approval_date: new Date().toISOString().slice(0, 10)
      };
      await api.put(`/expense-approvals/${item.id}`, payload);
      toast.success('Expense marked as Approved');
      onReload();
    } catch {
      toast.error('Failed to approve expense');
    }
  };

  // Direct Reject action
  const handleDirectReject = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm('Reject this expense request?')) return;
    try {
      const payload = {
        ...item,
        status: 'rejected'
      };
      await api.put(`/expense-approvals/${item.id}`, payload);
      toast.success('Expense marked as Rejected');
      onReload();
    } catch {
      toast.error('Failed to reject expense');
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const approvedTotal = items.filter(i => i.status === 'approved' || i.status === 'invoice_received' || i.status === 'deducted').reduce((sum, i) => sum + Number(i.approved_amount || i.estimated_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="between">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Expense Approvals Log</h4>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>Log repairs and maintenance expenses that require landlord (owner) approvals.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={openCreate}>Add Expense Request</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card" style={{ padding: 14, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Pending Landlord Review</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: pendingCount > 0 ? 'var(--warning)' : 'var(--muted-2)', marginTop: 6 }}>
            {pendingCount} Pending
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: 'var(--success-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700 }}>Approved Operational Expenses</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', marginTop: 6 }}>
            {money(approvedTotal)}
          </div>
        </div>
      </div>

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-pad" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="code-chip">{item.expense_code}</span>
                      <strong style={{ fontSize: 14 }}>{item.expense_type || 'General Repair'}</strong>
                      <StatusBadge status={item.status} />
                      <Badge tone={item.deduct_from_rent ? 'purple' : 'grey'}>
                        {item.deduct_from_rent ? 'Rent Deduction' : 'Direct Owner Invoice'}
                      </Badge>
                    </div>
                    {item.work_order_id && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
                        Linked Work Order: <strong>#{item.work_order_id}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {item.status === 'pending' && (
                      <>
                        <Button size="xs" variant="ghost" style={{ color: 'var(--success)', padding: '2px 8px', fontSize: 11 }} onClick={(e) => handleDirectApprove(item, e)}>
                          <Check size={12} style={{ marginRight: 2 }} /> Approve
                        </Button>
                        <Button size="xs" variant="ghost" style={{ color: 'var(--danger)', padding: '2px 8px', fontSize: 11 }} onClick={(e) => handleDirectReject(item, e)}>
                          <X size={12} style={{ marginRight: 2 }} /> Reject
                        </Button>
                      </>
                    )}
                    <button 
                      className="btn btn-ghost btn-sm btn-icon" 
                      style={{ color: 'var(--danger)' }} 
                      onClick={(e) => remove(item.id, e)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--text)' }}>
                  {item.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Estimated Cost:</span>{' '}
                    <strong>{money(item.estimated_amount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Approved Cost:</span>{' '}
                    <strong style={{ color: item.status === 'rejected' ? 'var(--danger)' : 'var(--text)' }}>
                      {item.approved_amount ? money(item.approved_amount) : 'TBD'}
                    </strong>
                  </div>
                  {item.approved_by && (
                    <div>
                      <span style={{ color: 'var(--muted)' }}>Approved By:</span>{' '}
                      <strong>{item.approved_by}</strong>
                    </div>
                  )}
                  {item.approval_date && (
                    <div>
                      <span style={{ color: 'var(--muted)' }}>Approve Date:</span>{' '}
                      <strong>{item.approval_date}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Wallet size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
          <p className="cell-sub" style={{ margin: 0 }}>No logged expenses for this property. Click the button above to request one.</p>
        </div>
      )}

      {showCreate && (
        <Drawer 
          title={selected ? `Edit Expense Approval · ${selected.expense_code}` : 'Log Expense Request'} 
          width={580} 
          onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Expense Item Type" required>
              <Input value={form.expense_type} onChange={(e) => setForm(s => ({ ...s, expense_type: e.target.value }))} placeholder="e.g. Water Pump repair, AC cleaning" />
            </Field>
            <Field label="Estimated Cost (৳)" required>
              <Input type="number" value={form.estimated_amount} onChange={(e) => setForm(s => ({ ...s, estimated_amount: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Approved Cost (৳)">
              <Input type="number" value={form.approved_amount} onChange={(e) => setForm(s => ({ ...s, approved_amount: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Work Order Reference ID">
              <Input type="number" value={form.work_order_id} onChange={(e) => setForm(s => ({ ...s, work_order_id: e.target.value }))} placeholder="e.g. 104" />
            </Field>
            <Field label="Expense Review Status" required>
              <Select value={form.status} onChange={(e) => setForm(s => ({ ...s, status: e.target.value }))}>
                <option value="pending">Pending Landlord Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected / Cancelled</option>
                <option value="invoice_received">Service Invoice Received</option>
                <option value="deducted">Settled / Deducted from rent</option>
                <option value="closed">Closed / Finished</option>
              </Select>
            </Field>
            <Field label="Approval Method">
              <Select value={form.approval_method} onChange={(e) => setForm(s => ({ ...s, approval_method: e.target.value }))}>
                <option value="whatsapp">WhatsApp Text / Chat</option>
                <option value="email">Formal Email</option>
                <option value="call">Phone Call Conversation</option>
                <option value="verbal">Verbal Approval</option>
                <option value="signed">Signed Work Estimate</option>
              </Select>
            </Field>
            <Field label="Approved By Name/Role">
              <Input value={form.approved_by} onChange={(e) => setForm(s => ({ ...s, approved_by: e.target.value }))} placeholder="e.g. Landlord Name" />
            </Field>
            <Field label="Approval Date">
              <Input type="date" value={form.approval_date} onChange={(e) => setForm(s => ({ ...s, approval_date: e.target.value }))} />
            </Field>
            <Field label="Landlord Options" full>
              <div style={{ display: 'flex', gap: 20 }}>
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={form.owner_approval_required} onChange={(e) => setForm(s => ({ ...s, owner_approval_required: e.target.checked }))} />
                  Owner Approval Req.
                </label>
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={form.deduct_from_rent} onChange={(e) => setForm(s => ({ ...s, deduct_from_rent: e.target.checked }))} />
                  Deduct from Rent
                </label>
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={form.invoice_received} onChange={(e) => setForm(s => ({ ...s, invoice_received: e.target.checked }))} />
                  Invoice Received
                </label>
              </div>
            </Field>
            <Field label="Service Description" required full>
              <Textarea value={form.description} onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))} rows={3} placeholder="Describe the repair details and estimated scopes..." />
            </Field>
            <Field label="Internal Notes" full>
              <Textarea value={form.notes} onChange={(e) => setForm(s => ({ ...s, notes: e.target.value }))} rows={2} placeholder="Add operational notes..." />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ─── ARREARS ACTIONS PANEL ────────────────────────────────────────────
export function PropertyArrearsTab({ propertyId, tenancyId, tenantContactId, ownerContactId, items = [], onReload }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const sendReminder = async () => {
    if (!tenancyId) return toast.error('No active tenancy to remind.');
    try { const { data } = await api.post(`/tenancies/${tenancyId}/send-rent-reminder`); toast.success(data.message); }
    catch (e) { toast.error(e.response?.data?.error || 'Reminder failed'); }
  };
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const defaults = {
    due_date: '',
    amount_due: '',
    amount_received: '0',
    outstanding_amount: '',
    days_overdue: '0',
    reminder_stage: 'none',
    reminder_sent_at: '',
    notice_issued: false,
    escalation_level: 'monitor',
    action_required: '',
    status: 'open',
    rental_ledger_id: '',
    notes: ''
  };

  const openCreate = () => {
    setForm(defaults);
    setSelected(null);
    setShowCreate(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      due_date: item.due_date || '',
      amount_due: item.amount_due || '',
      amount_received: item.amount_received || '0',
      outstanding_amount: item.outstanding_amount || '',
      days_overdue: item.days_overdue || '0',
      reminder_stage: item.reminder_stage || 'none',
      reminder_sent_at: item.reminder_sent_at ? item.reminder_sent_at.slice(0, 16) : '',
      notice_issued: !!item.notice_issued,
      escalation_level: item.escalation_level || 'monitor',
      action_required: item.action_required || '',
      status: item.status || 'open',
      rental_ledger_id: item.rental_ledger_id || '',
      notes: item.notes || ''
    });
    setShowCreate(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const outstanding = Number(form.amount_due || 0) - Number(form.amount_received || 0);
      const payload = {
        ...form,
        outstanding_amount: outstanding,
        property_id: propertyId,
        tenant_contact_id: tenantContactId,
        owner_contact_id: ownerContactId
      };
      if (selected) {
        await api.put(`/arrears-actions/${selected.id}`, payload);
        toast.success('Arrears action updated');
      } else {
        await api.post('/arrears-actions', payload);
        toast.success('Arrears record created');
      }
      setShowCreate(false);
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save arrears record');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this arrears action record?')) return;
    try {
      await api.delete(`/arrears-actions/${id}`);
      toast.success('Record deleted');
      onReload();
    } catch {
      toast.error('Failed to delete arrears record');
    }
  };

  const totalArrears = items.filter(i => i.status !== 'closed' && i.status !== 'resolved').reduce((sum, i) => sum + Number(i.outstanding_amount || 0), 0);
  const maxDays = items.filter(i => i.status !== 'closed' && i.status !== 'resolved').reduce((max, i) => Math.max(max, Number(i.days_overdue || 0)), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="between">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Rent Arrears & Collections</h4>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>Log collection tracking, reminder letters, and final legal notices for overdue rent.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={sendReminder}>Send reminder</Button>
          <Button size="sm" icon={Plus} onClick={openCreate}>Log Overdue Balance</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 14, background: 'var(--danger-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 700 }}>Overdue Amount (Arrears)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', marginTop: 6 }}>
            {money(totalArrears)}
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: maxDays > 14 ? 'var(--danger-bg)' : 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Max Days Overdue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: maxDays > 14 ? 'var(--danger)' : 'var(--text)', marginTop: 6 }}>
            {maxDays} Days
          </div>
        </div>
      </div>

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-pad" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="code-chip">{item.arrears_code}</span>
                      <strong style={{ fontSize: 13.5 }}>Rent Arrears</strong>
                      <StatusBadge status={item.status} />
                      <Badge tone={item.escalation_level === 'legal_review' || item.escalation_level === 'manager_review' ? 'red' : 'amber'}>
                        Escalation: {text(item.escalation_level)}
                      </Badge>
                      {item.notice_issued && (
                        <Badge tone="red" dot>Formal Notice Issued</Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 16 }}>
                      {item.due_date && <span>Due Date: <strong>{item.due_date}</strong></span>}
                      <span>Days Overdue: <strong style={{ color: Number(item.days_overdue) > 7 ? 'var(--danger)' : 'inherit' }}>{item.days_overdue} days</strong></span>
                      <span>Reminder: <strong>{text(item.reminder_stage)}</strong></span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm btn-icon" 
                    style={{ color: 'var(--danger)' }} 
                    onClick={(e) => remove(item.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 12, background: 'var(--surface-2)', padding: 8, borderRadius: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Total Due:</span>{' '}
                    <strong>{money(item.amount_due)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Paid Recd:</span>{' '}
                    <strong>{money(item.amount_received)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Outstanding:</span>{' '}
                    <strong style={{ color: 'var(--danger)' }}>{money(item.outstanding_amount)}</strong>
                  </div>
                </div>

                {item.action_required && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--primary-700)', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Info size={13} style={{ flexShrink: 0 }} />
                    <span>Next Action: <strong>{item.action_required}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <CalendarClock size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
          <p className="cell-sub" style={{ margin: 0 }}>No arrears or late payment alerts found. Ledger is completely clear!</p>
        </div>
      )}

      {showCreate && (
        <Drawer 
          title={selected ? `Edit Arrears Action · ${selected.arrears_code}` : 'Log Overdue Rent Balance'} 
          width={580} 
          onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Ledger Due Date" required>
              <Input type="date" value={form.due_date} onChange={(e) => setForm(s => ({ ...s, due_date: e.target.value }))} />
            </Field>
            <Field label="Overdue Rent Amount (৳)" required>
              <Input type="number" value={form.amount_due} onChange={(e) => setForm(s => ({ ...s, amount_due: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Amount Received (৳)">
              <Input type="number" value={form.amount_received} onChange={(e) => setForm(s => ({ ...s, amount_received: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Days Overdue" required>
              <Input type="number" value={form.days_overdue} onChange={(e) => setForm(s => ({ ...s, days_overdue: e.target.value }))} />
            </Field>
            <Field label="Reminder Stage" required>
              <Select value={form.reminder_stage} onChange={(e) => setForm(s => ({ ...s, reminder_stage: e.target.value }))}>
                <option value="none">No reminders sent</option>
                <option value="1_7_days">Day 1-7 Reminder</option>
                <option value="8_14_days">Day 8-14 Warning Notice</option>
                <option value="15_plus_days">Day 15+ Final Escalation</option>
                <option value="final_notice">Formal Eviction / Legal Notice</option>
              </Select>
            </Field>
            <Field label="Reminder Sent At">
              <Input type="datetime-local" value={form.reminder_sent_at} onChange={(e) => setForm(s => ({ ...s, reminder_sent_at: e.target.value }))} />
            </Field>
            <Field label="Escalation Status" required>
              <Select value={form.escalation_level} onChange={(e) => setForm(s => ({ ...s, escalation_level: e.target.value }))}>
                <option value="monitor">Monitoring Only</option>
                <option value="reminder_1">First SMS/Email Alert</option>
                <option value="reminder_2">Second Warning Letter</option>
                <option value="manager_review">Property Manager Direct Intervention</option>
                <option value="legal_review">Legal Solicitor Review</option>
              </Select>
            </Field>
            <Field label="Tracker Status" required>
              <Select value={form.status} onChange={(e) => setForm(s => ({ ...s, status: e.target.value }))}>
                <option value="open">Open (Arrears unpaid)</option>
                <option value="in_progress">Arrangement Drafted / Underway</option>
                <option value="resolved">Fully Resolved (Paid Clear)</option>
                <option value="written_off">Written off / Debt loss</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
            <Field label="Linked Ledger ID">
              <Input type="number" value={form.rental_ledger_id} onChange={(e) => setForm(s => ({ ...s, rental_ledger_id: e.target.value }))} placeholder="e.g. 504" />
            </Field>
            <Field label="Legal Notices Options" full>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={form.notice_issued} onChange={(e) => setForm(s => ({ ...s, notice_issued: e.target.checked }))} />
                Formal Eviction Notice / Legal Letter Issued to Resident
              </label>
            </Field>
            <Field label="Action Plan / Requirements" required full>
              <Input value={form.action_required} onChange={(e) => setForm(s => ({ ...s, action_required: e.target.value }))} placeholder="e.g. Tenant promised payment by Tuesday 5 PM..." />
            </Field>
            <Field label="Arrears Timeline Notes" full>
              <Textarea value={form.notes} onChange={(e) => setForm(s => ({ ...s, notes: e.target.value }))} rows={3} placeholder="Add comments on phone calls, payment promises, or arrangements..." />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ─── RENTAL MARKETING PANEL ───────────────────────────────────────────
export function PropertyMarketingTab({ propertyId, ownerContactId, items = [], onReload }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const defaults = {
    channel: '',
    asset_task: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'planned',
    enquiries_generated: '0',
    inspections_booked: '0',
    next_action: '',
    notes: ''
  };

  const openCreate = () => {
    setForm(defaults);
    setSelected(null);
    setShowCreate(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      channel: item.channel || '',
      asset_task: item.asset_task || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      budget: item.budget || '',
      status: item.status || 'planned',
      enquiries_generated: item.enquiries_generated || '0',
      inspections_booked: item.inspections_booked || '0',
      next_action: item.next_action || '',
      notes: item.notes || ''
    });
    setShowCreate(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        property_id: propertyId,
        owner_contact_id: ownerContactId
      };
      if (selected) {
        await api.put(`/marketing-activities/${selected.id}`, payload);
        toast.success('Marketing activity updated');
      } else {
        await api.post('/marketing-activities', payload);
        toast.success('Marketing activity added');
      }
      setShowCreate(false);
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save marketing record');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this marketing activity?')) return;
    try {
      await api.delete(`/marketing-activities/${id}`);
      toast.success('Marketing record deleted');
      onReload();
    } catch {
      toast.error('Failed to delete marketing record');
    }
  };

  const totalLeads = items.reduce((sum, i) => sum + Number(i.enquiries_generated || 0), 0);
  const totalBookings = items.reduce((sum, i) => sum + Number(i.inspections_booked || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="between">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Rental Marketing & Campaigns</h4>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>Promote listing on property channels, run Facebook lead ads, and record enquiries.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={openCreate}>Add Marketing Campaign</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifycontent: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Total Channels Active</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-600)', marginTop: 4 }}>
            {items.filter(i => i.status === 'active').length} Channels
          </div>
        </div>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifycontent: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Enquiries Generated</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
            {totalLeads} Leads
          </div>
        </div>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifycontent: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Inspections Booked</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--info)', marginTop: 4 }}>
            {totalBookings} Visits
          </div>
        </div>
      </div>

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-pad" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="code-chip">{item.marketing_code}</span>
                      <strong style={{ fontSize: 14 }}>{item.channel} Campaign</strong>
                      <StatusBadge status={item.status} />
                      <Badge tone="grey">Budget: {money(item.budget)}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 16 }}>
                      {item.start_date && <span>Start: <strong>{item.start_date}</strong></span>}
                      {item.end_date && <span>End: <strong>{item.end_date}</strong></span>}
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm btn-icon" 
                    style={{ color: 'var(--danger)' }} 
                    onClick={(e) => remove(item.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {item.asset_task && (
                  <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--text)' }}>
                    <strong>Task / Asset:</strong> {item.asset_task}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 12, background: 'var(--surface-2)', padding: 8, borderRadius: 8, fontSize: 12 }}>
                  <div>
                    Enquiries: <strong>{item.enquiries_generated} leads</strong>
                  </div>
                  <div>
                    Inspections: <strong>{item.inspections_booked} visits</strong>
                  </div>
                  {item.next_action && (
                    <div style={{ gridColumn: '1 / -1', color: 'var(--primary-700)', marginTop: 4 }}>
                      Next Action: <strong>{item.next_action}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Tags size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
          <p className="cell-sub" style={{ margin: 0 }}>No marketing campaigns registered. Click the button above to log one.</p>
        </div>
      )}

      {showCreate && (
        <Drawer 
          title={selected ? `Edit Campaign · ${selected.marketing_code}` : 'Add Marketing Campaign'} 
          width={580} 
          onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Marketing Channel" required>
              <Input value={form.channel} onChange={(e) => setForm(s => ({ ...s, channel: e.target.value }))} placeholder="e.g. Facebook, Bproperty, Signboard, Website" />
            </Field>
            <Field label="Campaign Budget (৳)">
              <Input type="number" value={form.budget} onChange={(e) => setForm(s => ({ ...s, budget: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm(s => ({ ...s, start_date: e.target.value }))} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={form.end_date} onChange={(e) => setForm(s => ({ ...s, end_date: e.target.value }))} />
            </Field>
            <Field label="Campaign Status" required>
              <Select value={form.status} onChange={(e) => setForm(s => ({ ...s, status: e.target.value }))}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
            <Field label="Enquiries Generated">
              <Input type="number" value={form.enquiries_generated} onChange={(e) => setForm(s => ({ ...s, enquiries_generated: e.target.value }))} />
            </Field>
            <Field label="Inspections Booked">
              <Input type="number" value={form.inspections_booked} onChange={(e) => setForm(s => ({ ...s, inspections_booked: e.target.value }))} />
            </Field>
            <Field label="Asset / Tasks details" full>
              <Input value={form.asset_task} onChange={(e) => setForm(s => ({ ...s, asset_task: e.target.value }))} placeholder="e.g. Graphic design, photography, listing copy..." />
            </Field>
            <Field label="Next Scheduled Action" full>
              <Input value={form.next_action} onChange={(e) => setForm(s => ({ ...s, next_action: e.target.value }))} placeholder="e.g. Boost post on Monday..." />
            </Field>
            <Field label="Detailed Notes / Analytics" full>
              <Textarea value={form.notes} onChange={(e) => setForm(s => ({ ...s, notes: e.target.value }))} rows={4} placeholder="Campaign description, targeting details, or performance notes..." />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ─── RISK REGISTER PANEL ──────────────────────────────────────────────
export function PropertyRisksTab({ propertyId, tenancyId, tenantContactId, ownerContactId, items = [], onReload }) {
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const defaults = {
    risk_category: '',
    description: '',
    likelihood: 'medium',
    impact: 'medium',
    risk_rating: 'medium',
    mitigation: '',
    owner_user_id: '',
    review_date: '',
    status: 'open'
  };

  const openCreate = () => {
    setForm(defaults);
    setSelected(null);
    setShowCreate(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      risk_category: item.risk_category || '',
      description: item.description || '',
      likelihood: item.likelihood || 'medium',
      impact: item.impact || 'medium',
      risk_rating: item.risk_rating || 'medium',
      mitigation: item.mitigation || '',
      owner_user_id: item.owner_user_id || '',
      review_date: item.review_date || '',
      status: item.status || 'open'
    });
    setShowCreate(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        property_id: propertyId,
        tenancy_id: tenancyId,
        tenant_contact_id: tenantContactId,
        owner_contact_id: ownerContactId
      };
      if (selected) {
        await api.put(`/property-risks/${selected.id}`, payload);
        toast.success('Risk record updated');
      } else {
        await api.post('/property-risks', payload);
        toast.success('Risk added to register');
      }
      setShowCreate(false);
      onReload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save risk record');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this risk record?')) return;
    try {
      await api.delete(`/property-risks/${id}`);
      toast.success('Risk record deleted');
      onReload();
    } catch {
      toast.error('Failed to delete risk');
    }
  };

  const activeCount = items.filter(i => i.status !== 'closed' && i.status !== 'mitigated').length;
  const criticalCount = items.filter(i => (i.risk_rating === 'critical' || i.risk_rating === 'high') && i.status !== 'closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="between">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Risk Register & Controls</h4>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>Track damage, subletting, arrears, tax liabilities, cost disputes, and mitigations.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={openCreate}>Add Risk Alert</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 14, background: 'var(--surface-2)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Active Risks Logged</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)', marginTop: 6 }}>
            {activeCount} Risks
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: criticalCount > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: criticalCount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>Critical / High Risks</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: criticalCount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 6 }}>
            {criticalCount} High Risk
          </div>
        </div>
      </div>

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-pad" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="code-chip">{item.risk_code}</span>
                      <strong style={{ fontSize: 14 }}>{item.risk_category || 'General Risk'}</strong>
                      <StatusBadge status={item.status} />
                      <Badge tone={item.risk_rating === 'critical' || item.risk_rating === 'high' ? 'red' : item.risk_rating === 'medium' ? 'amber' : 'green'}>
                        Rating: {item.risk_rating}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 16 }}>
                      <span>Likelihood: <strong>{item.likelihood}</strong></span>
                      <span>Impact: <strong>{item.impact}</strong></span>
                      {item.review_date && <span>Review Date: <strong>{item.review_date}</strong></span>}
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm btn-icon" 
                    style={{ color: 'var(--danger)' }} 
                    onClick={(e) => remove(item.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                  {item.description}
                </p>

                {item.mitigation && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--success-bg)', border: '1px solid var(--success-bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--success-text)' }}>
                    <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline', color: 'var(--success)' }} />
                    <strong>Mitigation Control:</strong> {item.mitigation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <ShieldAlert size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
          <p className="cell-sub" style={{ margin: 0 }}>No active risks logged for this property. Click the button above to register one.</p>
        </div>
      )}

      {showCreate && (
        <Drawer 
          title={selected ? `Edit Risk Alert · ${selected.risk_code}` : 'Add Risk Alert'} 
          width={580} 
          onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Risk Category/Subject" required>
              <Input value={form.risk_category} onChange={(e) => setForm(s => ({ ...s, risk_category: e.target.value }))} placeholder="e.g. Non-payment of Rent, Subletting without consent" />
            </Field>
            <Field label="Review Date">
              <Input type="date" value={form.review_date} onChange={(e) => setForm(s => ({ ...s, review_date: e.target.value }))} />
            </Field>
            <Field label="Likelihood" required>
              <Select value={form.likelihood} onChange={(e) => setForm(s => ({ ...s, likelihood: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Impact" required>
              <Select value={form.impact} onChange={(e) => setForm(s => ({ ...s, impact: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Overall Risk Rating" required>
              <Select value={form.risk_rating} onChange={(e) => setForm(s => ({ ...s, risk_rating: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
            <Field label="Risk Status" required>
              <Select value={form.status} onChange={(e) => setForm(s => ({ ...s, status: e.target.value }))}>
                <option value="open">Open / Uncontrolled</option>
                <option value="monitoring">Monitoring Status</option>
                <option value="mitigated">Mitigated (Control Active)</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
            <Field label="Assigned Review User ID">
              <Input type="number" value={form.owner_user_id} onChange={(e) => setForm(s => ({ ...s, owner_user_id: e.target.value }))} placeholder="e.g. 5" />
            </Field>
            <Field label="Risk Description" required full>
              <Textarea value={form.description} onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))} rows={3} placeholder="Describe the identified threat or issue..." />
            </Field>
            <Field label="Mitigation / Control Action" required full>
              <Textarea value={form.mitigation} onChange={(e) => setForm(s => ({ ...s, mitigation: e.target.value }))} rows={3} placeholder="What mitigation or control measures have been put in place to manage this risk?" />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
