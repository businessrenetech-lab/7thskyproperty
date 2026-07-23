import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, Wallet, Check, Send, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHead, DataTable, StatusBadge, Spinner, Button, Field, Input, Textarea, Select, Drawer, Badge } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DepositSettlements() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/deposit-settlements'); setRows(data.data || []); }
    catch { toast.error('Failed to load settlements'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  // Handle deep-link from Vacancies screen: ?tenancy_id=…&vacancy_notice_id=…
  useEffect(() => {
    if (params.get('tenancy_id')) {
      setCreating({ tenancy_id: Number(params.get('tenancy_id')), vacancy_notice_id: params.get('vacancy_notice_id') ? Number(params.get('vacancy_notice_id')) : null });
    }
    if (params.get('id')) {
      (async () => {
        try { const { data } = await api.get(`/deposit-settlements/${params.get('id')}`); setSelected(data.data); }
        catch {}
      })();
    }
  }, [params]);

  const columns = [
    { key: 'settlement_code', header: 'Code', render: (r) => <span className="code-chip">{r.settlement_code}</span> },
    { key: 'property', header: 'Property', render: (r) => r.property?.title || '—' },
    { key: 'tenant', header: 'Tenant', render: (r) => r.tenant?.full_name || '—' },
    { key: 'deposit_held', header: 'Deposit held', render: (r) => money(r.deposit_held) },
    { key: 'total_deductions', header: 'Deductions', render: (r) => <span style={{ color: 'var(--danger)' }}>({money(r.total_deductions)})</span> },
    { key: 'refund_amount', header: 'Refund', render: (r) => <strong style={{ color: r.refund_amount > 0 ? 'var(--success)' : 'var(--danger)' }}>{money(r.refund_amount)}</strong> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Deposit Settlements" desc="Bond adjustments — compute deductions, get owner approval, mark refunded, close tenancy." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} />
      </div>

      {creating && <CreateSettlement init={creating} onClose={() => setCreating(null)} onCreated={(s) => { setCreating(null); load(); setSelected(s); }} />}
      {selected && <SettlementDetail id={selected.id} onClose={() => setSelected(null)} onChanged={() => { load(); (async () => { try { const { data } = await api.get(`/deposit-settlements/${selected.id}`); setSelected(data.data); } catch {} })(); }} />}
    </>
  );
}

// ─── CREATE / PREVIEW ────────────────────────────────────────────────────────
function CreateSettlement({ init, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    tenancy_id: init.tenancy_id,
    vacancy_notice_id: init.vacancy_notice_id || null,
    damages_lines: [],
    cleaning: 0,
    utility_dues: 0,
    other_deductions: 0,
    other_lines: [],
    notes: '',
  });
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newDamage, setNewDamage] = useState({ label: '', amount: '' });

  const runPreview = async () => {
    try {
      const { data } = await api.post('/deposit-settlements/preview', form);
      setPreview(data.data);
    } catch (e) { toast.error(e.response?.data?.error || 'Preview failed'); }
  };

  useEffect(() => { runPreview(); /* eslint-disable-next-line */ }, []);

  const persist = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/deposit-settlements', form);
      toast.success(data.message);
      onCreated(data.data);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const addDamage = () => {
    if (!newDamage.label || !newDamage.amount) return;
    setForm((s) => ({ ...s, damages_lines: [...s.damages_lines, { ...newDamage, amount: Number(newDamage.amount) }] }));
    setNewDamage({ label: '', amount: '' });
  };
  const rmDamage = (i) => setForm((s) => ({ ...s, damages_lines: s.damages_lines.filter((_, idx) => idx !== i) }));

  return (
    <Drawer title="Compute Deposit Settlement" width={780} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="ghost" onClick={runPreview}>Preview</Button><Button onClick={persist} disabled={saving}>{saving ? <Spinner /> : 'Create Settlement'}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Deductions</h4>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Damages</div>
          {form.damages_lines.map((l, i) => (
            <div key={i} className="between" style={{ padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
              <span>{l.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{money(l.amount)}</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => rmDamage(i)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Input placeholder="Damage description" value={newDamage.label} onChange={(e) => setNewDamage((s) => ({ ...s, label: e.target.value }))} />
            <Input type="number" placeholder="Amount" value={newDamage.amount} onChange={(e) => setNewDamage((s) => ({ ...s, amount: e.target.value }))} style={{ width: 140 }} />
            <Button size="sm" icon={Plus} onClick={addDamage}>Add</Button>
          </div>
        </div>

        <div className="form-grid">
          <Field label="Cleaning (BDT)"><Input type="number" value={form.cleaning} onChange={(e) => setForm((s) => ({ ...s, cleaning: Number(e.target.value) }))} /></Field>
          <Field label="Utility dues (BDT)"><Input type="number" value={form.utility_dues} onChange={(e) => setForm((s) => ({ ...s, utility_dues: Number(e.target.value) }))} /></Field>
          <Field label="Other deductions (BDT)"><Input type="number" value={form.other_deductions} onChange={(e) => setForm((s) => ({ ...s, other_deductions: Number(e.target.value) }))} /></Field>
        </div>

        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Field>

        <Button variant="ghost" onClick={runPreview}>Recompute Preview</Button>

        {preview && (
          <div className="card" style={{ padding: 14, background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
            <h4 style={{ marginTop: 0 }}>Preview</h4>
            <SummaryLine label="Deposit held" value={money(preview.deposit_held)} strong />
            <SummaryLine label="Advance rent held" value={money(preview.advance_rent_held)} />
            <SummaryLine label="Unpaid rent / service (from invoices)" value={`(${money(preview.unpaid_rent + preview.unpaid_service_charge)})`} />
            <SummaryLine label="Damages" value={`(${money(preview.damages)})`} />
            <SummaryLine label="Cleaning" value={`(${money(preview.cleaning)})`} />
            <SummaryLine label="Utility dues" value={`(${money(preview.utility_dues)})`} />
            <SummaryLine label="Other" value={`(${money(preview.other_deductions)})`} />
            <div style={{ borderTop: '2px solid var(--primary)', marginTop: 6, paddingTop: 6 }}>
              <SummaryLine label="REFUNDABLE TO TENANT" value={money(preview.refund_amount)} big />
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ─── DETAIL / DECIDE / REFUND ────────────────────────────────────────────────
function SettlementDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [refundForm, setRefundForm] = useState({ refund_method: 'bank_transfer', refund_reference: '' });
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/deposit-settlements/${id}`); setData(data.data); }
    catch { toast.error('Load failed'); }
  }, [id, toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, msg) => {
    setBusy(msg);
    try { const r = await fn(); toast.success(r?.data?.message || msg); await load(); onChanged?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(null); }
  };

  const decide = (decision) => act(() => api.post(`/deposit-settlements/${id}/decide`, { decision }), `Owner decision recorded: ${decision}`);
  const refund = () => act(() => api.post(`/deposit-settlements/${id}/mark-refunded`, refundForm), 'Refund recorded, tenancy closed');
  // The control chain — one recorded action per stage, each by a different person.
  const stage = (path, body, msg) => act(() => api.post(`/deposit-settlements/${id}/${path}`, body), msg);

  if (!data) return <Drawer title="Loading…" onClose={onClose}><div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Drawer>;

  const st = data.status;
  const isDraft = ['computing', 'pending_owner', 'disputed'].includes(st);
  const mine = (who) => who && who === user?.id;
  const cannotReview = mine(data.submitted_by);
  const cannotApprove = mine(data.reviewed_by) || mine(data.submitted_by);

  const lines = Array.isArray(data.deduction_lines) ? data.deduction_lines : (() => { try { return JSON.parse(data.deduction_lines || '[]'); } catch { return []; } })();

  return (
    <Drawer title={`Settlement ${data.settlement_code}`} width={720} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {isDraft && (
          <>
            <Button variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => decide('disputed')} disabled={busy}>Owner disputed</Button>
            {!data.owner_approved && <Button variant="ghost" onClick={() => decide('approved')} disabled={busy}>Owner signed off</Button>}
            <Button icon={Send} onClick={() => stage('submit', {}, 'Submitted for independent review')} disabled={busy}>Submit for review</Button>
          </>
        )}
        {st === 'pending_review' && (
          <>
            <Button variant="ghost" onClick={() => stage('review', { decision: 'rejected' }, 'Sent back to the preparer')} disabled={busy}>Send back</Button>
            <Button icon={ShieldCheck} onClick={() => stage('review', { decision: 'reviewed' }, 'Independent review recorded')} disabled={busy || cannotReview}
              title={cannotReview ? 'You submitted this — someone else must review it.' : undefined}>Record review</Button>
          </>
        )}
        {st === 'reviewed' && (
          <Button icon={Check} onClick={() => stage('approve', {}, 'Settlement approved')} disabled={busy || cannotApprove}
            title={cannotApprove ? 'You submitted or reviewed this — someone else must approve it.' : undefined}>Approve</Button>
        )}
        {st === 'approved' && (
          <Button icon={Wallet} onClick={refund} disabled={busy}>Finalise &amp; lock</Button>
        )}
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
          <div style={{ fontWeight: 700 }}>{data.property?.title}</div>
          <div className="cell-sub">Tenant: {data.tenant?.full_name} · Owner: {data.owner?.full_name}</div>
        </div>

        <div className="card" style={{ padding: 14, background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
          <SummaryLine label="Deposit held" value={money(data.deposit_held)} strong />
          <SummaryLine label="Advance rent held" value={money(data.advance_rent_held)} />
          {lines.map((l, i) => <SummaryLine key={i} label={l.label} value={`(${money(l.amount)})`} />)}
          <SummaryLine label="Total deductions" value={`(${money(data.total_deductions)})`} strong />
          <div style={{ borderTop: '2px solid var(--primary)', marginTop: 6, paddingTop: 8 }}>
            <SummaryLine label="REFUNDABLE TO TENANT" value={money(data.refund_amount)} big />
          </div>
        </div>

        {data.status === 'approved' && (
          <div className="card" style={{ padding: 12 }}>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>Refund details</h4>
            <div className="form-grid">
              <Field label="Method">
                <Select value={refundForm.refund_method} onChange={(e) => setRefundForm((s) => ({ ...s, refund_method: e.target.value }))}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </Select>
              </Field>
              <Field label="Reference"><Input value={refundForm.refund_reference} onChange={(e) => setRefundForm((s) => ({ ...s, refund_reference: e.target.value }))} placeholder="TX123456" /></Field>
            </div>
            <p className="cell-sub" style={{ fontSize: 12, margin: 0 }}>Recording the refund closes the tenancy and marks move-out complete.</p>
          </div>
        )}

        {data.owner_decision_note && (
          <div className="cell-sub" style={{ fontSize: 12.5, padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
            <strong>Owner note:</strong> {data.owner_decision_note}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function SummaryLine({ label, value, strong, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: big ? 16 : 13, fontWeight: big ? 800 : strong ? 700 : 500, color: big ? 'var(--primary)' : 'var(--text)' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
