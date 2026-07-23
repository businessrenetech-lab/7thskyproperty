import React, { useCallback, useEffect, useState } from 'react';
import { Receipt, CreditCard, Users, Search, Banknote } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, EmptyState, SearchInput, Drawer, Field, Input, Select } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();
const num = (v) => Number(v || 0);

// Shared amount-entry drawer for client payments + provider payouts.
function AmountDrawer({ title, label, maxAmount, methodField, onClose, onSubmit }) {
  const [amount, setAmount] = useState(String(maxAmount || ''));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); try { await onSubmit({ amount: Number(amount), method, reference }); } finally { setBusy(false); } };
  return (
    <Drawer title={title} width={440} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Banknote} onClick={submit} disabled={busy || !Number(amount)}>{busy ? <Spinner /> : `Pay ${money(amount || 0)}`}</Button></>}>
      <Field label={label} required><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      {maxAmount != null && <div className="cell-sub" style={{ fontSize: 12, marginTop: -8, marginBottom: 10 }}>Remaining: {money(maxAmount)}. Enter less for a partial / milestone payment.</div>}
      {methodField && (<>
        <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cash">Cash</option><option value="cheque">Cheque</option></Select></Field>
        <Field label="Reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / slip no." /></Field>
      </>)}
    </Drawer>
  );
}

// ═══ CUSTOMER LISTS ═════════════════════════════════════════════════════════
export function CustomerLists() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get(`/care/customers?limit=200${q ? `&search=${encodeURIComponent(q)}` : ''}`); setRows(data.data || []); } catch { } finally { setLoading(false); } }, [q]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="pm-scope">
      <PageHead title="Customer Lists" desc="Service customers and their job history." actions={<SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" />} />
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={Users} title="No service customers yet" hint="Customers appear here once they're on a work order or enquiry (linked to a contact)." /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Jobs</th><th>Lifetime value</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}><td className="cell-strong">{c.full_name}</td><td>{c.primary_phone || '—'}</td><td>{c.email || '—'}</td><td><Badge tone="blue">{c.jobs}</Badge></td><td className="pm-num">{money(c.lifetime_value)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══ INVOICING ══════════════════════════════════════════════════════════════
export default function CareInvoicing() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [payWo, setPayWo] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/care/work-orders?limit=300'); setRows((data.data || []).filter((w) => Number(w.service_value) > 0)); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const raise = async (id) => { try { const { data } = await api.post(`/care/work-orders/${id}/invoice`); toast.success(data.message); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } };
  const recordPayment = async ({ amount, method, reference }) => {
    try { const { data } = await api.post(`/invoices/${payWo.invoice_id}/payments`, { amount, method, reference }); toast.success('Client payment recorded — income booked, provider payable accrued.'); setPayWo(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const billed = rows.filter((w) => w.invoice_id);
  const unbilled = rows.filter((w) => !w.invoice_id && ['completed', 'inspected'].includes(w.status));
  return (
    <div className="pm-scope">
      <PageHead title="Service Invoicing" desc="Invoice customers for completed service work. Client pays Seventh Sky." />
      <div className="pm-card" style={{ marginBottom: 16 }}>
        <div className="pm-card-h"><div className="ic" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}><Receipt size={16} /></div><h3>Ready to invoice</h3><div className="sp" /><Badge tone={unbilled.length ? 'amber' : 'green'}>{unbilled.length}</Badge></div>
        <div className="pm-card-body flush" style={{ overflowX: 'auto' }}>
          {loading ? <div style={{ padding: 30, textAlign: 'center' }}><Spinner /></div> : !unbilled.length ? <div className="pm-empty"><div className="ic"><Check size /></div>Nothing awaiting invoice.</div> : (
            <table className="pm-tbl"><thead><tr><th>Work order</th><th>Customer</th><th>Service</th><th>Value</th><th /></tr></thead>
              <tbody>{unbilled.map((w) => (<tr key={w.id}><td><span className="code-chip">{w.work_order_code}</span></td><td>{w.customer_name || '—'}</td><td>{w.service_name}</td><td className="pm-num">{money(w.service_value)}</td><td style={{ textAlign: 'right' }}><Button size="sm" icon={Receipt} onClick={() => raise(w.id)}>Raise invoice</Button></td></tr>))}</tbody>
            </table>
          )}
        </div>
      </div>
      <div className="pm-card">
        <div className="pm-card-h"><div className="ic"><Receipt size={16} /></div><h3>Invoiced</h3><div className="sp" /><Badge tone="green">{billed.length}</Badge></div>
        <div className="pm-card-body flush" style={{ overflowX: 'auto' }}>
          {!billed.length ? <div className="pm-empty" style={{ padding: 24 }}>No invoices raised yet.</div> : (
            <table className="pm-tbl"><thead><tr><th>Work order</th><th>Customer</th><th>Service</th><th>Value</th><th>Paid</th><th>Payment</th><th /></tr></thead>
              <tbody>{billed.map((w) => { const due = num(w.service_value) - num(w.client_paid_amount); return (
                <tr key={w.id}><td><span className="code-chip">{w.work_order_code}</span></td><td>{w.customer_name || '—'}</td><td>{w.service_name}</td><td className="pm-num">{money(w.service_value)}</td><td className="pm-num">{money(w.client_paid_amount)}</td><td><Badge tone={['paid', 'settled', 'provider_paid'].includes(w.payment_status) ? 'green' : 'amber'} dot>{w.payment_status}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{due > 0.01 ? <Button size="sm" icon={Banknote} onClick={() => setPayWo(w)}>Record payment</Button> : <span className="cell-sub">Paid</span>}</td></tr>
              ); })}</tbody>
            </table>
          )}
        </div>
      </div>
      {payWo && <AmountDrawer title={`Record payment — ${payWo.work_order_code}`} label="Amount received (৳)" maxAmount={num(payWo.service_value) - num(payWo.client_paid_amount)} methodField onClose={() => setPayWo(null)} onSubmit={recordPayment} />}
    </div>
  );
}

// ═══ PAYMENTS & DISBURSEMENTS TO 3RD PARTY ══════════════════════════════════
export function CarePayments() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [payWo, setPayWo] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/care/work-orders?limit=300'); setRows(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const remainingOf = (w) => num(w.provider_charge) - num(w.provider_paid_amount);
  const pay = async ({ amount }) => { try { const { data } = await api.post(`/care/work-orders/${payWo.id}/pay-provider`, { amount }); toast.success(data.message); setPayWo(null); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } };

  const payable = rows.filter((w) => w.assigned_provider_id && remainingOf(w) > 0.01 && ['completed', 'inspected', 'invoiced', 'paid'].includes(w.status));
  const paid = rows.filter((w) => ['provider_paid', 'settled'].includes(w.payment_status) || (w.assigned_provider_id && num(w.provider_paid_amount) > 0 && remainingOf(w) <= 0.01));
  const totalPayable = payable.reduce((a, w) => a + remainingOf(w), 0);
  return (
    <div className="pm-scope">
      <PageHead title="Payments & Disbursements" desc="Pay third-party providers their charge from completed work — via their provider folio." />
      <div className="pm-card" style={{ padding: 16, marginBottom: 16, background: 'var(--surface-2)' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Total payable to providers</div>
        <div className="pm-num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--warn)' }}>{money(totalPayable)}</div>
        <div className="cell-sub">{payable.length} work order{payable.length === 1 ? '' : 's'} awaiting payout</div>
      </div>
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <>
          <div className="pm-card" style={{ marginBottom: 16 }}>
            <div className="pm-card-h"><div className="ic" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}><CreditCard size={16} /></div><h3>Awaiting payout</h3></div>
            <div className="pm-card-body flush" style={{ overflowX: 'auto' }}>
              {!payable.length ? <div className="pm-empty" style={{ padding: 24 }}>No provider payouts due.</div> : (
                <table className="pm-tbl"><thead><tr><th>Work order</th><th>Provider</th><th>Service</th><th>Charge</th><th>Paid</th><th>Remaining</th><th /></tr></thead>
                  <tbody>{payable.map((w) => (<tr key={w.id}><td><span className="code-chip">{w.work_order_code}</span></td><td>{w.provider?.company_name || '—'}</td><td>{w.service_name}</td><td className="pm-num">{money(w.provider_charge)}</td><td className="pm-num">{money(w.provider_paid_amount)}</td><td className="pm-num" style={{ fontWeight: 700, color: 'var(--warn)' }}>{money(remainingOf(w))}</td><td style={{ textAlign: 'right' }}><Button size="sm" icon={Banknote} onClick={() => setPayWo(w)}>Pay provider</Button></td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
          <div className="pm-card">
            <div className="pm-card-h"><div className="ic" style={{ background: 'var(--good-bg)', color: 'var(--good)' }}><Check size={16} /></div><h3>Paid</h3><div className="sp" /><Badge tone="green">{paid.length}</Badge></div>
            <div className="pm-card-body flush" style={{ overflowX: 'auto' }}>
              {!paid.length ? <div className="pm-empty" style={{ padding: 24 }}>No payouts yet.</div> : (
                <table className="pm-tbl"><thead><tr><th>Work order</th><th>Provider</th><th>Charge</th></tr></thead>
                  <tbody>{paid.map((w) => (<tr key={w.id}><td><span className="code-chip">{w.work_order_code}</span></td><td>{w.provider?.company_name || '—'}</td><td className="pm-num">{money(w.provider_charge)}</td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
      {payWo && <AmountDrawer title={`Pay provider — ${payWo.work_order_code}`} label="Payout amount (৳)" maxAmount={remainingOf(payWo)} onClose={() => setPayWo(null)} onSubmit={pay} />}
    </div>
  );
}

// Local Check icon (avoid extra import churn)
function Check({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>; }
