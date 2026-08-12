import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, RefreshCw, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, WtTabs, Pill, dateFmt, bdt, WtDrawer, Loading, EmptyState, toast, errText,
} from './common';

/*
 * Payments & Disbursements — both sides of the money on a water-tank job.
 * Client pays Seventh Sky against an invoice; Seventh Sky pays the third-party
 * provider its charge off the work order. What's left is Seventh Sky's margin.
 * Moved here from Property Care and rewired to water-tank records.
 */

const num = (v) => Number(v || 0);
const METHODS = ['bank_transfer', 'bkash', 'nagad', 'cash', 'cheque'];
const METHOD_LABEL = { bank_transfer: 'Bank transfer', bkash: 'bKash', nagad: 'Nagad', cash: 'Cash', cheque: 'Cheque' };

/* Shared amount-entry drawer for client receipts and provider payouts. */
function AmountDrawer({ title, subtitle, label, maxAmount, note, onClose, onSubmit }) {
  const [amount, setAmount] = useState(maxAmount ?? '');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  /*
   * One key per drawer opening, sent with the request. If the button is
   * double-clicked, or the answer is lost and the user retries, the server sees
   * the same key and returns the movement it already recorded rather than
   * posting the money a second time. A fresh drawer means a fresh key, so a
   * genuine second payment of the same amount is still accepted.
   */
  const [idemKey] = useState(() => `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const go = async () => {
    const value = Number(amount);
    if (!(value > 0)) { setErr('Enter an amount greater than zero.'); return; }
    if (maxAmount != null && value > maxAmount) { setErr(`Cannot exceed the remaining balance of ${bdt(maxAmount)}.`); return; }
    setBusy(true); setErr('');
    try { await onSubmit({ amount: value, method, reference, idempotency_key: idemKey }); }
    catch (e) { setErr(errText(e, 'Could not record this')); setBusy(false); }
  };

  const remaining = maxAmount != null ? Math.max(0, maxAmount - Number(amount || 0)) : null;

  return (
    <WtDrawer title={title} subtitle={subtitle} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={go}><Banknote size={14} /> {busy ? 'Saving…' : `Pay ${bdt(Number(amount) || 0)}`}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      {note && <div className="wt-note">{note}</div>}
      <div className="wt-field">
        <label>{label}</label>
        <input className="wt-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {remaining != null && <span className="hint">Remaining after this: {bdt(remaining)}. Enter less for a partial / milestone payment.</span>}
      </div>
      <div className="wt-field">
        <label>Method</label>
        <select className="wt-select" value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
        </select>
      </div>
      <div className="wt-field">
        <label>Reference</label>
        <input className="wt-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / slip no." />
      </div>
    </WtDrawer>
  );
}

export default function Payments() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Client Receivables');
  const [receipt, setReceipt] = useState(null);
  const [payout, setPayout] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/wt-ops/payments')
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setError(errText(e, 'Could not load payments')); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const t = data?.totals || {};
  const receivable = data?.receivable || [];
  const payable = data?.payable || [];
  const payoutBlocked = data?.payout_blocked || [];
  const settled = data?.settled || [];

  /*
   * Both of these post to the specialist controllers, which write through the
   * single money ledger. The old /wt-ops/... paths answered from an unguarded
   * router that incremented a balance outside a transaction; they now return 410.
   *
   * `duplicate` says the server matched this request to one already recorded, so
   * the operator is told the truth — "already recorded" — instead of a success
   * message implying a second payment landed.
   */
  const recordReceipt = async (body) => {
    const r = await api.post(`/wt-invoices/${receipt.code}/payments`, body);
    const outstanding = num(r.data.totals?.outstanding);
    toast.ok(r.data.duplicate ? `Already recorded on ${receipt.code} — nothing was posted twice`
      : (outstanding <= 0.01 ? `${receipt.code} settled in full` : `${bdt(body.amount)} received on ${receipt.code}`));
    setReceipt(null); load();
  };

  const payProvider = async (body) => {
    const r = await api.post(`/wt-work-orders/${payout.id}/pay-provider`, body);
    toast.ok(r.data.duplicate ? `Already paid on ${payout.code} — nothing was paid twice`
      : (num(r.data.remaining) <= 0.01 ? `${payout.code} payout cleared` : `${bdt(body.amount)} paid — ${bdt(r.data.remaining)} still due`));
    setPayout(null); load();
  };

  const counts = { 'Client Receivables': receivable.length, 'Provider Payouts': payable.length, 'Blocked Payouts': payoutBlocked.length, 'Settled Payouts': settled.length };

  if (loading) return (<><WtHead title="Payments & Disbursements" subtitle="Client receipts and third-party provider payouts" /><Loading /></>);

  if (error) return (
    <>
      <WtHead title="Payments & Disbursements" subtitle="Client receipts and third-party provider payouts" />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load payments" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  return (
    <>
      <WtHead title="Payments & Disbursements" subtitle="Client receipts and third-party provider payouts">
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </WtHead>

      <div className="wt-kpis">
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-ic" style={{ background: 'rgba(37,99,235,0.10)', color: 'var(--wt-blue)' }}><ArrowDownLeft /></span>
          <div>
            <div className="wt-kpi-label">Receivable from clients</div>
            <div className="wt-kpi-value">{bdt(t.receivable)}</div>
            <div className="wt-kpi-sub">{t.receivable_count || 0} invoice{t.receivable_count === 1 ? '' : 's'} outstanding</div>
          </div>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-ic" style={{ background: 'rgba(217,119,6,0.10)', color: 'var(--wt-amber)' }}><ArrowUpRight /></span>
          <div>
            <div className="wt-kpi-label">Payable to providers</div>
            <div className="wt-kpi-value" style={{ color: t.payable ? 'var(--wt-amber)' : undefined }}>{bdt(t.payable)}</div>
            <div className="wt-kpi-sub">{t.payable_count || 0} work order{t.payable_count === 1 ? '' : 's'} awaiting payout</div>
          </div>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-ic" style={{ background: 'rgba(5,150,105,0.10)', color: 'var(--wt-green)' }}><Wallet /></span>
          <div>
            <div className="wt-kpi-label">Collected</div>
            <div className="wt-kpi-value">{bdt(t.collected)}</div>
            <div className="wt-kpi-sub">{bdt(t.disbursed)} disbursed to providers</div>
          </div>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-ic" style={{ background: 'var(--wt-accent-tint)', color: 'var(--wt-accent)' }}><Banknote /></span>
          <div>
            <div className="wt-kpi-label">Seventh Sky margin</div>
            <div className="wt-kpi-value">{bdt(t.margin)}</div>
            <div className="wt-kpi-sub">{bdt(t.ss_fees)} in allocation fees booked</div>
          </div>
        </div>
      </div>

      <WtTabs tabs={['Client Receivables', 'Provider Payouts', 'Blocked Payouts', 'Settled Payouts']} value={tab} onChange={setTab} counts={counts} />

      {tab === 'Client Receivables' && (
        <div className="wt-card wt-tblcard">
          {receivable.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 96 }}>Invoice</th><th style={{ width: 100 }}>Project</th><th>Client</th><th style={{ width: 132 }}>Type</th><th style={{ width: 108 }}>Due Date</th><th style={{ width: 112, textAlign: 'right' }}>Invoiced</th><th style={{ width: 112, textAlign: 'right' }}>Paid</th><th style={{ width: 116, textAlign: 'right' }}>Due</th><th style={{ width: 110 }}>Status</th><th style={{ width: 140 }} /></tr></thead>
              <tbody>
                {receivable.map((i) => (
                  <tr key={i.id} className="click" onClick={() => nav(`/water-tank/invoices?focus=${encodeURIComponent(i.code)}`)}>
                    <td className="id">{i.code}</td>
                    <td className="muted">{i.project_id || '—'}</td>
                    <td><strong>{i.client_name}</strong></td>
                    <td className="muted">{i.inv_type || '—'}</td>
                    <td className="muted">{dateFmt(i.due_date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(i.amount)}</td>
                    <td style={{ textAlign: 'right' }} className="muted">{bdt(i.paid_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--wt-red)' }}>{bdt(i.due)}</td>
                    <td><Pill value={i.status} sm /></td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button className="wt-btn sm primary" onClick={() => setReceipt(i)}><Banknote size={13} /> Record payment</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState eyebrow="Client Receivables" title="Nothing outstanding" hint="Every issued invoice has been settled in full." />}
        </div>
      )}

      {tab === 'Provider Payouts' && (
        <div className="wt-card wt-tblcard">
          {payable.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 92 }}>WO No</th><th style={{ width: 100 }}>Project</th><th>Provider</th><th style={{ width: 150 }}>Client</th><th style={{ width: 124 }}>Category</th><th style={{ width: 112, textAlign: 'right' }}>Charge</th><th style={{ width: 108, textAlign: 'right' }}>Paid</th><th style={{ width: 116, textAlign: 'right' }}>Remaining</th><th style={{ width: 128 }}>WO Status</th><th style={{ width: 130 }} /></tr></thead>
              <tbody>
                {payable.map((w) => (
                  <tr key={w.id} className="click" onClick={() => nav(`/water-tank/work-orders?focus=${encodeURIComponent(w.code)}`)}>
                    <td className="id">{w.code}</td>
                    <td className="muted">{w.project_id || '—'}</td>
                    <td><strong>{w.provider_name}</strong></td>
                    <td className="muted">{w.client_name}</td>
                    <td className="muted">{w.category || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(w.provider_fee)}</td>
                    <td style={{ textAlign: 'right' }} className="muted">{bdt(w.provider_paid_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--wt-amber)' }}>{bdt(w.remaining)}</td>
                    <td><Pill value={w.status} sm /></td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button className="wt-btn sm primary" onClick={() => setPayout(w)}><Banknote size={13} /> Pay provider</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState eyebrow="Provider Payouts" title="No payouts due" hint="A payout enters this queue only when the trigger in the signed provider agreement is satisfied." />}
        </div>
      )}

      {tab === 'Blocked Payouts' && (
        <div className="wt-card wt-tblcard">
          {payoutBlocked.length ? <table className="wt-tbl"><thead><tr><th>Work order</th><th>Provider</th><th>Client</th><th>Agreement</th><th>Required trigger</th><th>Blocked by</th><th style={{ textAlign: 'right' }}>Net payout</th></tr></thead><tbody>{payoutBlocked.map((w) => <tr className="click" key={w.id} onClick={() => nav(`/water-tank/work-orders/${w.code}`)}><td className="id">{w.code}</td><td><strong>{w.provider_name}</strong></td><td className="muted">{w.client_name}</td><td className="id">{w.agreement_code || '—'}</td><td>{w.payout_trigger || '—'}</td><td><span className="wt-pill sm amber">{w.blocked_reason}</span></td><td style={{ textAlign: 'right', fontWeight: 800 }}>{bdt(w.remaining)}</td></tr>)}</tbody></table> : <EmptyState eyebrow="Payout controls" title="No blocked payouts" hint="All provider obligations are either not yet payable or have satisfied their signed trigger." />}
        </div>
      )}

      {tab === 'Settled Payouts' && (
        <div className="wt-card wt-tblcard">
          {settled.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 92 }}>WO No</th><th>Provider</th><th style={{ width: 160 }}>Client</th><th style={{ width: 112, textAlign: 'right' }}>Charge</th><th style={{ width: 112, textAlign: 'right' }}>Paid</th><th style={{ width: 108 }}>Paid On</th><th style={{ width: 118 }}>Method</th><th style={{ width: 130 }}>Reference</th><th style={{ width: 128 }}>Payout</th></tr></thead>
              <tbody>
                {settled.map((w) => (
                  <tr key={w.id} className="click" onClick={() => nav(`/water-tank/work-orders?focus=${encodeURIComponent(w.code)}`)}>
                    <td className="id">{w.code}</td>
                    <td><strong>{w.provider_name || '—'}</strong></td>
                    <td className="muted">{w.client_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(w.provider_fee)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--wt-green)' }}>{bdt(w.provider_paid_amount)}</td>
                    <td className="muted">{dateFmt(w.payout_date)}</td>
                    <td className="muted">{METHOD_LABEL[w.payout_method] || w.payout_method || '—'}</td>
                    <td className="muted">{w.payout_reference || '—'}</td>
                    <td><Pill value={w.payout_status} sm /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState eyebrow="Settled Payouts" title="No payouts recorded yet" />}
        </div>
      )}

      {receipt && (
        <AmountDrawer
          title={`Record payment — ${receipt.code}`}
          subtitle={receipt.client_name}
          label="Amount received (৳)"
          maxAmount={num(receipt.due)}
          note={`Invoice total ${bdt(receipt.amount)}, ${bdt(receipt.due)} still due. Settling in full marks the invoice Paid and puts the provider payout in the queue.`}
          onClose={() => setReceipt(null)} onSubmit={recordReceipt}
        />
      )}

      {payout && (
        <AmountDrawer
          title={`Pay provider — ${payout.code}`}
          subtitle={payout.provider_name}
          label="Payout amount (৳)"
          maxAmount={num(payout.remaining)}
          note={`Agreement ${payout.agreement_code}: gross ${bdt(payout.provider_gross_charge)}, commission ${bdt(payout.provider_commission_amount)}, net payout ${bdt(payout.provider_fee)}. Due by ${dateFmt(payout.due_at)}.`}
          onClose={() => setPayout(null)} onSubmit={payProvider}
        />
      )}
    </>
  );
}
