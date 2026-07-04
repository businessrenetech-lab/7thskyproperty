import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Wrench, ShieldCheck, Play, CheckCircle2, ClipboardCheck, AlertTriangle, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Select, Textarea, SearchInput, KV, Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => (v == null || v === '' ? '—' : 'BDT ' + Number(v).toLocaleString());

const SEVERITY_TONE = { emergency: 'red', urgent: 'amber', normal: 'blue', cosmetic: 'grey' };
const SEVERITIES = ['emergency', 'urgent', 'normal', 'cosmetic'];
const CATEGORIES = ['plumbing', 'electrical', 'ac', 'appliance', 'structural', 'cleaning', 'security', 'general'];

const STAGE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'pending_owner', label: 'Owner Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function WorkOrders() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: 100, include_counts: 'true' });
      if (search) p.set('search', search);
      if (stage === 'pending_owner') p.set('approval_status', 'pending_owner');
      else if (stage !== 'all') p.set('tenant_visible_status', stage);
      const { data } = await api.get(`/work-orders?${p}`);
      setRows(data.data || []);
      setCounts(data.stage_counts || {});
    } catch { toast.error('Failed to load work orders'); }
    finally { setLoading(false); }
  }, [search, stage, toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ title: '', provider_id: null, property_id: null, scope: '', scheduled_date: '', amount: '', status: 'draft', severity: 'normal', category: 'general', estimated_cost: '' });
    setDrawer('create');
  };
  const create = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    try { await api.post('/work-orders', form); toast.success('Work order created'); setDrawer(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };

  const openView = async (r) => {
    setSel(r); setDrawer('view'); setDetail(null);
    try { const { data } = await api.get(`/work-orders/${r.id}`); setDetail(data.data); }
    catch { toast.error('Load failed'); }
  };
  const refreshDetail = async () => {
    const { data } = await api.get(`/work-orders/${sel.id}`);
    setDetail(data.data);
    load();
  };

  const columns = [
    { key: 'work_order_code', header: 'WO', render: (r) => <span className="code-chip">{r.work_order_code}</span> },
    { key: 'title', header: 'Title', render: (r) => (
      <div>
        <div className="cell-strong">{r.title}</div>
        <div className="cell-sub" style={{ textTransform: 'capitalize' }}>{r.category || 'general'} · reported by {r.reported_by_type || 'staff'}</div>
      </div>
    ) },
    { key: 'severity', header: 'Severity', render: (r) => <Badge tone={SEVERITY_TONE[r.severity] || 'grey'} dot>{r.severity || 'normal'}</Badge> },
    { key: 'property', header: 'Property', render: (r) => r.property?.title || '—' },
    { key: 'approval', header: 'Approval', render: (r) => r.approval_status === 'pending_owner'
      ? <Badge tone="amber" dot>Owner pending</Badge>
      : r.approval_status === 'approved' ? <Badge tone="green">Approved</Badge>
      : r.approval_status === 'rejected' ? <Badge tone="red">Rejected</Badge>
      : <span className="cell-sub">—</span> },
    { key: 'cost', header: 'Est / Actual', render: (r) => <span className="cell-sub">{money(r.estimated_cost)} / <strong style={{ color: 'var(--text)' }}>{money(r.actual_cost)}</strong></span> },
    { key: 'stage', header: 'Stage', render: (r) => <StatusBadge status={r.tenant_visible_status || r.status} /> },
  ];

  return (
    <>
      <PageHead title="Maintenance / Work Orders" desc="Full maintenance lifecycle — triage, owner approval, provider assignment, completion and auto-billing."
        actions={<Button icon={Plus} onClick={openCreate}>New Work Order</Button>} />

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {STAGE_TABS.map((t) => (
          <button key={t.key} className={`tab ${stage === t.key ? 'active' : ''}`} onClick={() => setStage(t.key)}>
            {t.label}{counts[t.key] != null && t.key !== 'all' ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
        {counts.emergency > 0 && <Badge tone="red" dot>{counts.emergency} emergency open</Badge>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad" style={{ padding: 14 }}><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or code…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && (
        <Drawer title="New Work Order" width={600} onClose={() => setDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="form-grid">
              <Field label="Severity">
                <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Category">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Property"><Combo endpoint="/properties" labelFn={(p) => `${p.title} (${p.property_code || ''})`} value={form.property_id} onChange={(v) => setForm({ ...form, property_id: v })} placeholder="Search property…" /></Field>
            <Field label="Provider"><Combo endpoint="/providers" labelFn={(p) => p.company_name} value={form.provider_id} onChange={(v) => setForm({ ...form, provider_id: v })} placeholder="Assign provider…" /></Field>
            <div className="form-grid">
              <Field label="Scheduled date"><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></Field>
              <Field label="Estimated cost (৳)"><Input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} /></Field>
            </div>
            <Field label="Scope of work"><Textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} /></Field>
          </div>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.work_order_code || 'Work Order'} width={720} onClose={() => setDrawer(null)}>
          {!detail ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : (
            <WorkOrderDetail wo={detail} onChanged={refreshDetail} />
          )}
        </Drawer>
      )}
    </>
  );
}

// ─── DETAIL: lifecycle actions + quotes ─────────────────────────────────────
function WorkOrderDetail({ wo, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [triage, setTriage] = useState({ severity: wo.severity || 'normal', category: wo.category || 'general', estimated_cost: wo.estimated_cost || '', approval_threshold: wo.approval_threshold || 5000, notes: '' });
  const [assign, setAssign] = useState({ provider_id: wo.provider_id || null, scheduled_date: wo.scheduled_date || '', amount: wo.amount || '' });
  const [completeForm, setCompleteForm] = useState({ actual_cost: wo.estimated_cost || wo.amount || '', provider_notes: '', tenant_recharge: false, tenant_recharge_amount: '' });
  const [quote, setQuote] = useState({ provider_name: '', quote_amount: '', notes: '' });
  const [panel, setPanel] = useState(null); // 'triage' | 'assign' | 'complete' | null

  const act = async (fn, msg) => {
    setBusy(true);
    try { const r = await fn(); toast.success(r?.data?.message || msg); setPanel(null); await onChanged(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const doTriage = () => act(() => api.post(`/work-orders/${wo.id}/triage`, triage), 'Triaged');
  const doDecide = (decision) => act(() => api.post(`/work-orders/${wo.id}/decide`, { decision }), `Work order ${decision}`);
  const doAssign = () => act(() => api.post(`/work-orders/${wo.id}/assign`, assign), 'Assigned');
  const doStart = () => act(() => api.post(`/work-orders/${wo.id}/start`), 'Started');
  const doComplete = () => act(() => api.post(`/work-orders/${wo.id}/complete`, completeForm), 'Completed');
  const addQuote = () => {
    if (!quote.quote_amount) return toast.error('Quote amount required');
    act(() => api.post(`/work-orders/${wo.id}/quotes`, quote).then((r) => { setQuote({ provider_name: '', quote_amount: '', notes: '' }); return r; }), 'Quote added');
  };
  const selectQuote = (qid) => act(() => api.post(`/work-orders/${wo.id}/quotes/${qid}/select`), 'Quote selected');

  const stage = wo.tenant_visible_status || 'submitted';
  const isDone = stage === 'completed' || stage === 'cancelled';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
        <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="code-chip">{wo.work_order_code}</span>
              <Badge tone={SEVERITY_TONE[wo.severity] || 'grey'} dot>{wo.severity || 'normal'}</Badge>
              <Badge tone="blue">{wo.category || 'general'}</Badge>
              <StatusBadge status={stage} />
              {wo.approval_status === 'pending_owner' && <Badge tone="amber" dot>Owner approval pending</Badge>}
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 6 }}>{wo.title}</div>
            <div className="cell-sub">{wo.property?.title || '—'} · reported by {wo.reported_by_type || 'staff'}{wo.sla_due_at ? ` · SLA ${new Date(wo.sla_due_at).toLocaleDateString()}` : ''}</div>
          </div>
        </div>
        {wo.scope && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>{wo.scope}</div>}
      </div>

      {/* Money strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <MiniStat label="Estimated" value={money(wo.estimated_cost)} />
        <MiniStat label="Actual" value={money(wo.actual_cost)} />
        <MiniStat label="Threshold" value={money(wo.approval_threshold)} />
        <MiniStat label="Recharge" value={wo.tenant_recharge ? money(wo.tenant_recharge_amount) : 'No'} />
      </div>
      {(wo.landlord_bill_id || wo.tenant_recharge_invoice_id) && (
        <div className="cell-sub" style={{ fontSize: 12 }}>
          {wo.landlord_bill_id ? `Landlord bill #${wo.landlord_bill_id} raised. ` : ''}
          {wo.tenant_recharge_invoice_id ? `Tenant recharge invoice #${wo.tenant_recharge_invoice_id} raised.` : ''}
        </div>
      )}

      {/* Lifecycle actions */}
      {!isDone && (
        <div className="card" style={{ padding: 12 }}>
          <h4 className="form-section-title" style={{ marginTop: 0 }}>Actions</h4>
          <div className="wrap-gap">
            <Button size="sm" variant="ghost" icon={ClipboardCheck} onClick={() => setPanel(panel === 'triage' ? null : 'triage')}>Triage</Button>
            {wo.approval_status === 'pending_owner' && (
              <>
                <Button size="sm" icon={ShieldCheck} onClick={() => doDecide('approved')} disabled={busy}>Approve (on owner's behalf)</Button>
                <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => doDecide('rejected')} disabled={busy}>Reject</Button>
              </>
            )}
            <Button size="sm" variant="ghost" icon={Wrench} onClick={() => setPanel(panel === 'assign' ? null : 'assign')}>Assign / Schedule</Button>
            <Button size="sm" variant="ghost" icon={Play} onClick={doStart} disabled={busy}>Start Work</Button>
            <Button size="sm" icon={CheckCircle2} onClick={() => setPanel(panel === 'complete' ? null : 'complete')}>Complete…</Button>
          </div>

          {panel === 'triage' && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
              <div className="form-grid">
                <Field label="Severity"><Select value={triage.severity} onChange={(e) => setTriage((s) => ({ ...s, severity: e.target.value }))}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
                <Field label="Category"><Select value={triage.category} onChange={(e) => setTriage((s) => ({ ...s, category: e.target.value }))}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                <Field label="Estimated cost (৳)"><Input type="number" value={triage.estimated_cost} onChange={(e) => setTriage((s) => ({ ...s, estimated_cost: e.target.value }))} /></Field>
                <Field label="Owner approval threshold (৳)"><Input type="number" value={triage.approval_threshold} onChange={(e) => setTriage((s) => ({ ...s, approval_threshold: e.target.value }))} /></Field>
              </div>
              <div className="cell-sub" style={{ fontSize: 12, margin: '6px 0' }}>If estimated cost ≥ threshold, the owner must approve before work starts (visible in their landlord portal).</div>
              <Button size="sm" onClick={doTriage} disabled={busy}>{busy ? <Spinner /> : 'Save Triage'}</Button>
            </div>
          )}

          {panel === 'assign' && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
              <Field label="Provider"><Combo endpoint="/providers" labelFn={(p) => p.company_name} value={assign.provider_id} onChange={(v) => setAssign((s) => ({ ...s, provider_id: v }))} placeholder="Select provider…" /></Field>
              <div className="form-grid">
                <Field label="Scheduled date"><Input type="date" value={assign.scheduled_date} onChange={(e) => setAssign((s) => ({ ...s, scheduled_date: e.target.value }))} /></Field>
                <Field label="Agreed amount (৳)"><Input type="number" value={assign.amount} onChange={(e) => setAssign((s) => ({ ...s, amount: e.target.value }))} /></Field>
              </div>
              <Button size="sm" onClick={doAssign} disabled={busy}>{busy ? <Spinner /> : 'Assign & Schedule'}</Button>
            </div>
          )}

          {panel === 'complete' && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
              <div className="form-grid">
                <Field label="Actual cost (৳)" required><Input type="number" value={completeForm.actual_cost} onChange={(e) => setCompleteForm((s) => ({ ...s, actual_cost: e.target.value }))} /></Field>
                <Field label="Recharge tenant?">
                  <Select value={completeForm.tenant_recharge ? 'yes' : 'no'} onChange={(e) => setCompleteForm((s) => ({ ...s, tenant_recharge: e.target.value === 'yes' }))}>
                    <option value="no">No — owner pays</option>
                    <option value="yes">Yes — tenant-caused damage</option>
                  </Select>
                </Field>
              </div>
              {completeForm.tenant_recharge && (
                <Field label="Tenant recharge amount (৳)"><Input type="number" value={completeForm.tenant_recharge_amount} onChange={(e) => setCompleteForm((s) => ({ ...s, tenant_recharge_amount: e.target.value }))} placeholder="Defaults to actual cost" /></Field>
              )}
              <Field label="Provider notes"><Textarea rows={2} value={completeForm.provider_notes} onChange={(e) => setCompleteForm((s) => ({ ...s, provider_notes: e.target.value }))} /></Field>
              <div className="cell-sub" style={{ fontSize: 12, margin: '6px 0' }}>Completing auto-creates the landlord bill{completeForm.tenant_recharge ? ' + a tenant recharge invoice' : ''}.</div>
              <Button size="sm" onClick={doComplete} disabled={busy}>{busy ? <Spinner /> : 'Complete & Bill'}</Button>
            </div>
          )}
        </div>
      )}

      {/* Quotes */}
      <div className="card" style={{ padding: 12 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Provider Quotes ({wo.quotes?.length || 0})</h4>
        {(wo.quotes || []).map((q) => (
          <div key={q.id} className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong>{q.provider_name || `Provider #${q.provider_id}`}</strong>
              <span className="cell-sub"> · {money(q.quote_amount)}</span>
              {q.notes && <div className="cell-sub" style={{ fontSize: 11.5 }}>{q.notes}</div>}
            </div>
            {q.is_selected ? <Badge tone="green" dot>Selected</Badge> : !isDone && <Button size="sm" variant="ghost" onClick={() => selectQuote(q.id)}>Select</Button>}
          </div>
        ))}
        {!isDone && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Provider name"><Input value={quote.provider_name} onChange={(e) => setQuote((s) => ({ ...s, provider_name: e.target.value }))} placeholder="Alpha ACs" /></Field>
            <Field label="Quote (৳)"><Input type="number" value={quote.quote_amount} onChange={(e) => setQuote((s) => ({ ...s, quote_amount: e.target.value }))} /></Field>
            <Field label="Notes"><Input value={quote.notes} onChange={(e) => setQuote((s) => ({ ...s, notes: e.target.value }))} /></Field>
            <Button size="sm" icon={Plus} onClick={addQuote} disabled={busy}>Add</Button>
          </div>
        )}
      </div>

      {wo.owner_decision_note && (
        <div className="cell-sub" style={{ fontSize: 12.5, padding: 10, background: 'var(--primary-50)', borderRadius: 6 }}>
          <strong>Owner note:</strong> {wo.owner_decision_note} {wo.owner_decision_at ? `· ${new Date(wo.owner_decision_at).toLocaleString()}` : ''}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}
