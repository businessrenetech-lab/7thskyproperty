import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Banknote, ArrowDownToLine, Users, RefreshCw, Send } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Field, Input, Select, Textarea, Drawer, Spinner, Badge } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

/**
 * PropertyPayouts — the money panel on the property detail page:
 *  · Owner held balance (net) + Pay owner
 *  · Tenant 3-way outstanding (rent arrears / invoices / service+utility → total)
 *  · Tenant refund + "tenant paid supplier directly" memo
 */
export default function PropertyPayouts({ property, ownerContactId, tenancy }) {
  const toast = useToast();
  const [ownerPreview, setOwnerPreview] = useState(null);
  const [tenantOut, setTenantOut] = useState(null);
  const [drawer, setDrawer] = useState(null); // 'pay-owner' | 'refund' | 'memo'
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const jobs = [ownerContactId ? api.get(`/disbursements/owner/${ownerContactId}/preview?property_id=${property.id}`) : Promise.resolve({ data: { data: null } })];
      jobs.push(tenancy?.id ? api.get(`/disbursements/tenant/${tenancy.id}/outstanding`) : Promise.resolve({ data: { data: null } }));
      const [op, to] = await Promise.all(jobs);
      setOwnerPreview(op.data.data);
      setTenantOut(to.data.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [ownerContactId, property.id, tenancy?.id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Owner held balance */}
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}><Wallet size={16} color="var(--primary)" /> Owner balance (held by us)</div>
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
        </div>
        {ownerPreview ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>{money(ownerPreview.payable)}</div>
            {ownerPreview.breakdown && (
              <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap', fontSize: 12.5 }}>
                <span>Rent collected <strong>{money(ownerPreview.breakdown.rent_collected)}</strong></span>
                <span style={{ color: 'var(--danger)' }}>Mgmt fees ({money(ownerPreview.breakdown.fees_deducted)})</span>
                {ownerPreview.breakdown.already_paid > 0 && <span className="cell-sub">Paid so far {money(ownerPreview.breakdown.already_paid)}</span>}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Button icon={Banknote} onClick={() => setDrawer('pay-owner')} disabled={!(ownerPreview.payable > 0)}>Pay owner</Button>
            </div>
          </>
        ) : <div className="cell-sub">No owner linked / no folio yet.</div>}
      </div>

      {/* Tenant 3-way outstanding */}
      {tenantOut && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 10 }}><Users size={16} color="var(--warning)" /> Tenant outstanding</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <OutBox label="Rent arrears" value={tenantOut.rent_arrears} tone="red" />
            <OutBox label="Invoices" value={tenantOut.invoices} tone="amber" />
            <OutBox label="Service / utility" value={tenantOut.service_utility} tone="amber" />
            <OutBox label="Total outstanding" value={tenantOut.total} tone="red" strong />
          </div>
          {tenantOut.memo_paid_directly > 0 && (
            <div className="cell-sub" style={{ marginTop: 8, fontSize: 12 }}>Paid to suppliers directly (memo, not owed): {money(tenantOut.memo_paid_directly)}</div>
          )}
          {tenancy?.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Button size="sm" variant="ghost" icon={ArrowDownToLine} onClick={() => setDrawer('refund')}>Refund tenant</Button>
              <Button size="sm" variant="ghost" icon={Send} onClick={() => setDrawer('memo')}>Tenant paid supplier directly</Button>
            </div>
          )}
        </div>
      )}

      {drawer === 'pay-owner' && ownerPreview && (
        <PayOwnerDrawer property={property} ownerContactId={ownerContactId} preview={ownerPreview} onClose={() => setDrawer(null)} onDone={() => { setDrawer(null); load(); }} />
      )}
      {drawer === 'refund' && (
        <TenantActionDrawer title="Refund tenant" tenancyId={tenancy.id} endpoint="/disbursements/tenant" fields="refund" onClose={() => setDrawer(null)} onDone={() => { setDrawer(null); load(); }} />
      )}
      {drawer === 'memo' && (
        <TenantActionDrawer title="Tenant paid supplier directly" tenancyId={tenancy.id} endpoint="/disbursements/tenant-personal-payment" fields="memo" onClose={() => setDrawer(null)} onDone={() => { setDrawer(null); load(); }} />
      )}
    </div>
  );
}

function OutBox({ label, value, tone, strong }) {
  const c = { red: 'var(--danger)', amber: 'var(--warning)', green: 'var(--success)' }[tone] || 'var(--text)';
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: strong ? 18 : 15, fontWeight: 800, marginTop: 2, color: Number(value) > 0 ? c : 'var(--muted)' }}>{money(value)}</div>
    </div>
  );
}

function PayOwnerDrawer({ property, ownerContactId, preview, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: String(preview.payable || ''), method: preview.bank?.preferred_payment || 'bank_transfer', reference: '', period_label: currentPeriod(), notes: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/disbursements/owner', { owner_contact_id: ownerContactId, property_id: property.id, amount: Number(form.amount), method: form.method, reference: form.reference, period_label: form.period_label, notes: form.notes });
      toast.success(data.message); onDone();
    } catch (e) { toast.error(e.response?.data?.error || 'Payout failed'); } finally { setBusy(false); }
  };
  return (
    <Drawer title={`Pay owner — ${property.title}`} width={520} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Banknote} onClick={submit} disabled={busy || !Number(form.amount)}>{busy ? <Spinner /> : `Pay ${money(form.amount || 0)}`}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Payable</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>{money(preview.payable)}</div>
          {preview.bank && <div className="cell-sub" style={{ marginTop: 4 }}>{preview.bank.bank_name} · {preview.bank.bank_account_number}</div>}
        </div>
        <div className="form-grid">
          <Field label="Amount (৳)" required><Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} /></Field>
          <Field label="Method"><Select value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}><option value="bank_transfer">Bank Transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cheque">Cheque</option><option value="cash">Cash</option></Select></Field>
          <Field label="Reference"><Input value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} /></Field>
          <Field label="Period"><Input type="month" value={form.period_label} onChange={(e) => setForm((s) => ({ ...s, period_label: e.target.value }))} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Field>
      </div>
    </Drawer>
  );
}

function TenantActionDrawer({ title, tenancyId, endpoint, fields, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: '', kind: 'overpayment', description: '', method: 'bank_transfer', reference: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!Number(form.amount)) return toast.error('Amount required');
    setBusy(true);
    try {
      const body = fields === 'refund'
        ? { tenancy_id: tenancyId, amount: Number(form.amount), kind: form.kind, method: form.method, reference: form.reference }
        : { tenancy_id: tenancyId, amount: Number(form.amount), description: form.description };
      const { data } = await api.post(endpoint, body);
      toast.success(data.message); onDone();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); }
  };
  return (
    <Drawer title={title} width={480} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Save'}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Amount (৳)" required><Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} /></Field>
        {fields === 'refund' ? (
          <>
            <Field label="Type"><Select value={form.kind} onChange={(e) => setForm((s) => ({ ...s, kind: e.target.value }))}><option value="overpayment">Overpayment</option><option value="deposit">Deposit refund</option></Select></Field>
            <Field label="Method"><Select value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}><option value="bank_transfer">Bank Transfer</option><option value="bkash">bKash</option><option value="cash">Cash</option></Select></Field>
            <Field label="Reference"><Input value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} /></Field>
          </>
        ) : (
          <>
            <Field label="What was it for?"><Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Paid plumber directly…" /></Field>
            <div className="cell-sub" style={{ fontSize: 12 }}>This is recorded on the tenant folio + reports for visibility only. It does <b>not</b> change tenant outstanding or the owner balance.</div>
          </>
        )}
      </div>
    </Drawer>
  );
}
