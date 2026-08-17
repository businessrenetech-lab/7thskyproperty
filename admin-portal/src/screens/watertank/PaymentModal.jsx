import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Check, Loader2, Wallet, Undo2, CornerUpLeft, AlertTriangle,
  Clock, Mail, ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Pill, toast, errText } from './common';

/*
 * Record Payment — a centred modal over one invoice.
 *
 * The control this replaces was a right-hand drawer that asked for an amount and
 * then PATCHed `outstanding` and `status` straight onto the invoice row. Two
 * things were wrong with it. It bypassed the ledger, so the money left no
 * auditable trace and the balance was whatever the last writer said it was. And
 * since generic writes to invoices were closed off, it answered 405 — the button
 * had been dead, silently, rather than dangerous.
 *
 * This posts through /wt-invoices/:code/payments, which is the single writer:
 * one transaction, a locked invoice row, an immutable ledger entry, and a
 * balance derived by summing those entries rather than by incrementing a column.
 *
 * Three things a payment screen has to get right, and each is a feature here:
 *
 *   NEVER TWICE. An idempotency key is minted when the modal opens and sent with
 *   the request, so a double-click, a slow network and a hit of Retry all resolve
 *   to the same single receipt. The server says whether it posted or replayed and
 *   this screen reports honestly either way.
 *
 *   THE REFERENCE MATCHES THE METHOD. bKash wants a TrxID, a cheque wants its
 *   number and bank. Asking for "reference" and hoping is how a payment becomes
 *   unreconcilable three months later.
 *
 *   A CORRECTION IS NOT A REFUND. Reversing says the entry was wrong. Refunding
 *   says the money arrived and we gave it back. They are separate actions here
 *   because they are separate events in the client's statement and in the bank.
 */

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

/** A key this browser mints once per dialog, so a retry cannot post twice. */
const mintKey = () => `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const KIND_LABEL = { receipt: 'Payment', reversal: 'Reversed', refund: 'Refunded' };

export default function PaymentModal({ invoice: seed, onClose, onDone }) {
  const [inv, setInv] = useState(seed);
  const [ref, setRef] = useState(null);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('pay'); // 'pay' | 'refund'
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  // One key per dialog opening, reset after a successful post so a second
  // genuine payment in the same session is not mistaken for a replay.
  const key = useRef(mintKey());

  const outstanding = round2(num(inv.outstanding));
  const received = round2(num(inv.paid_amount));
  const total = round2(num(inv.amount));
  const overdueDays = inv.due_date
    ? Math.ceil((Date.now() - new Date(inv.due_date)) / 864e5) : 0;

  const [f, setF] = useState({
    amount: outstanding || total,
    method: 'Cash',
    reference: '',
    received_on: today(),
    note: '',
    email_receipt: true,
  });
  const [refundF, setRefundF] = useState({ amount: '', reason: '', method: 'Cash', reference: '', refunded_on: today() });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setR = (k, v) => setRefundF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-invoices/reference')
      .then((r) => setRef(r.data))
      .catch(() => setRef({ payment_methods: [{ value: 'Cash' }] }));
  }, []);

  const loadHistory = () => {
    api.get(`/wt-invoices/${inv.code}/payments`)
      .then((r) => setHistory(Array.isArray(r.data?.rows) ? r.data.rows : []))
      .catch(() => setHistory([]));
  };
  useEffect(loadHistory, [inv.code]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const method = useMemo(
    () => (ref?.payment_methods || []).find((m) => m.value === f.method) || { value: f.method },
    [ref, f.method],
  );
  const refundable = round2(received);

  /*
   * A payment identical in amount and reference to one already on file, on the
   * same day, is far more often a double entry than a real second payment. The
   * ledger would catch the exact case through its derived key; saying so BEFORE
   * the operator commits is better than telling them afterwards.
   */
  const looksDuplicate = useMemo(() => history.some((h) => num(h.amount) > 0
    && Math.abs(num(h.amount) - num(f.amount)) < 0.009
    && String(h.received_on || '').slice(0, 10) === f.received_on), [history, f.amount, f.received_on]);

  const remaining = round2(outstanding - num(f.amount));

  const pay = async () => {
    const amount = num(f.amount);
    if (!(amount > 0)) { setErr('Enter an amount greater than zero.'); return; }
    if (amount > outstanding + 0.009) { setErr(`That is more than the ${bdt(outstanding)} still owed on this invoice.`); return; }
    if (method.reference_required && !f.reference.trim()) {
      setErr(`${method.reference_label || 'A reference'} is required for a ${f.method} payment — without it this cannot be reconciled.`);
      return;
    }
    if (f.received_on > today()) { setErr('A payment cannot be received in the future.'); return; }

    setBusy('pay'); setErr('');
    try {
      const r = await api.post(`/wt-invoices/${inv.code}/payments`, {
        amount, method: f.method, reference: f.reference || null,
        received_on: f.received_on, note: f.note || null,
        email_receipt: f.email_receipt,
        idempotency_key: key.current,
      });
      setInv(r.data.invoice);
      key.current = mintKey();
      loadHistory();
      setF((s) => ({ ...s, amount: round2(num(r.data.invoice.outstanding)), reference: '', note: '' }));
      toast[r.data.duplicate ? 'err' : 'ok'](
        r.data.duplicate
          ? 'Already recorded — nothing was posted twice.'
          : `${bdt(amount)} recorded on ${inv.code}.${r.data.receipt_emailed ? ' Receipt emailed.' : ''}`,
      );
      onDone?.(r.data.invoice);
    } catch (e) { setErr(errText(e, 'Could not record the payment')); }
    finally { setBusy(''); }
  };

  const refund = async () => {
    const amount = num(refundF.amount);
    if (!(amount > 0)) { setErr('Enter a refund amount greater than zero.'); return; }
    if (amount > refundable + 0.009) { setErr(`At most ${bdt(refundable)} can be refunded — that is what was actually received.`); return; }
    if (!refundF.reason.trim()) { setErr('Give a reason. A refund is money leaving the business.'); return; }

    setBusy('refund'); setErr('');
    try {
      const r = await api.post(`/wt-invoices/${inv.code}/refunds`, {
        ...refundF, amount, idempotency_key: key.current,
      });
      setInv(r.data.invoice);
      key.current = mintKey();
      loadHistory();
      setRefundF({ amount: '', reason: '', method: 'Cash', reference: '', refunded_on: today() });
      setMode('pay');
      toast.ok(r.data.message);
      onDone?.(r.data.invoice);
    } catch (e) { setErr(errText(e, 'Could not record the refund')); }
    finally { setBusy(''); }
  };

  const reverse = async (row) => {
    const reason = window.prompt(`Reverse the ${bdt(row.amount)} recorded on ${dateFmt(row.received_on)}?\n\nSay why — this stays on the audit trail permanently.`);
    if (reason == null) return;
    if (!reason.trim()) { toast.err('A reversal needs a reason.'); return; }
    setBusy(`rev-${row.id}`);
    try {
      const r = await api.post(`/wt-invoices/${inv.code}/payments/${row.id}/reverse`, { reason });
      setInv(r.data.invoice);
      loadHistory();
      toast.ok('Payment reversed. Both entries stay on the record.');
      onDone?.(r.data.invoice);
    } catch (e) { toast.err(errText(e, 'Could not reverse that')); }
    finally { setBusy(''); }
  };

  const settled = outstanding <= 0.009;
  // Worth nothing and never paid: not settled, just empty.
  const empty = settled && total <= 0.009 && received <= 0.009;

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 860 }}>
        <div className="wt-modal-head">
          <div>
            <h3><Wallet size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
              {mode === 'refund' ? 'Refund Client' : 'Record Payment'}</h3>
            <div className="sub">{inv.code} · {inv.client_name}</div>
          </div>
          <button className="wt-modal-x" onClick={onClose} disabled={!!busy}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          {/* Where this invoice stands. Facts, not inputs. */}
          <div className="wt-ctxcard">
            <div className="wt-ctxcard-head">
              <span><strong>{inv.code}</strong> <Pill value={inv.status} sm /></span>
              {overdueDays > 0 && outstanding > 0 && (
                <span className="wt-chip warn"><Clock size={11} style={{ verticalAlign: -1 }} /> {overdueDays} days past due</span>
              )}
            </div>
            <div className="wt-ctxgrid">
              <span><span className="muted">Invoice total</span><b>{bdt(total)}</b></span>
              <span><span className="muted">Received</span><b style={{ color: 'var(--wt-green)' }}>{bdt(received)}</b></span>
              <span><span className="muted">Still owed</span>
                <b style={{ color: outstanding > 0 ? 'var(--wt-red)' : 'var(--wt-green)' }}>{bdt(outstanding)}</b></span>
              <span><span className="muted">Due</span><b>{inv.due_date ? dateFmt(inv.due_date) : '—'}</b></span>
            </div>
          </div>

          {mode === 'pay' ? (
            <>
              {settled ? (
                /*
                 * An invoice is worth the sum of its LINES, not the number in
                 * its amount column. A few older rows carry an amount but no
                 * lines, so they are worth nothing and can take no payment.
                 * Saying "settled in full" there would be a lie, and the raw API
                 * error — "exceeds the outstanding balance of 0" — explains
                 * nothing to the person holding the client's money.
                 */
                empty ? (
                  <div className="wt-note" style={{ marginTop: 12, display: 'flex', gap: 8, borderColor: '#fcd34d' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: '#b45309' }} />
                    <span>
                      This invoice has no line items, so it is worth nothing and cannot take a
                      payment — an invoice is the sum of what it bills for, not a number typed
                      into a total. Open it and add what is being charged for, then come back.
                    </span>
                  </div>
                ) : (
                  <div className="wt-note" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <Check size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--wt-green)' }} />
                    <span>
                      This invoice is settled in full. If money needs to go back to the client,
                      use <b>Refund</b> below rather than reversing — unless the entry itself was a mistake.
                    </span>
                  </div>
                )
              ) : (
                <>
                  <div className="wt-field" style={{ marginTop: 14 }}>
                    <label>Amount received</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input className="wt-input" type="number" step="0.01" style={{ flex: '1 0 0' }}
                        value={f.amount} onChange={(e) => set('amount', e.target.value)} />
                      {/* The three amounts an operator actually types. */}
                      <button className={`wt-chip${round2(num(f.amount)) === outstanding ? ' on' : ''}`}
                        onClick={() => set('amount', outstanding)}>Full {bdt(outstanding)}</button>
                      <button className="wt-chip" onClick={() => set('amount', round2(outstanding / 2))}>Half</button>
                    </div>
                    <span className="hint">
                      {remaining <= 0.009
                        ? `Settles ${inv.code} in full.`
                        : `Leaves ${bdt(remaining)} outstanding — the invoice stays open.`}
                    </span>
                  </div>

                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>How they paid</label>
                      <select className="wt-select" value={f.method} onChange={(e) => { set('method', e.target.value); set('reference', ''); }}>
                        {(ref?.payment_methods || []).map((m) => <option key={m.value}>{m.value}</option>)}
                      </select>
                    </div>
                    <div className="wt-field">
                      <label>Date received</label>
                      <input className="wt-input" type="date" max={today()} value={f.received_on}
                        onChange={(e) => set('received_on', e.target.value)} />
                    </div>
                  </div>

                  <div className="wt-field">
                    <label>
                      {method.reference_label || 'Reference'}
                      {method.reference_required ? '' : ' (optional)'}
                    </label>
                    <input className="wt-input" value={f.reference} onChange={(e) => set('reference', e.target.value)}
                      placeholder={method.reference_label || 'Anything that identifies this payment'} />
                    <span className="hint">{method.reference_hint || 'What you would quote if this payment had to be traced.'}</span>
                  </div>

                  {looksDuplicate && (
                    <div className="wt-note" style={{ display: 'flex', gap: 8, borderColor: '#fcd34d' }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: '#b45309' }} />
                      <span>
                        A payment of {bdt(f.amount)} is already recorded against this invoice on that date.
                        If this is the same money, do not record it again — check the history below.
                      </span>
                    </div>
                  )}

                  <div className="wt-field">
                    <label>Note (optional)</label>
                    <input className="wt-input" value={f.note} onChange={(e) => set('note', e.target.value)}
                      placeholder="Anything the books should remember about this payment" />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={f.email_receipt} onChange={(e) => set('email_receipt', e.target.checked)} />
                    <Mail size={13} /> Email the client a receipt
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <div className="wt-note" style={{ marginTop: 12, display: 'flex', gap: 8, borderColor: '#fecaca' }}>
                <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--wt-red)' }} />
                <span>
                  A refund is money leaving the business. Use it when the client paid and is
                  getting some of it back — an overpayment, a cancelled job, a goodwill
                  settlement. If the payment was <b>entered by mistake</b> and no money ever
                  moved, reverse that entry in the history instead: the books should not show
                  a refund that never happened.
                </span>
              </div>

              <div className="wt-grid2" style={{ marginTop: 12 }}>
                <div className="wt-field">
                  <label>Amount to refund</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="wt-input" type="number" step="0.01" style={{ flex: '1 0 0' }}
                      value={refundF.amount} onChange={(e) => setR('amount', e.target.value)} />
                    <button className="wt-chip" onClick={() => setR('amount', refundable)}>All {bdt(refundable)}</button>
                  </div>
                  <span className="hint">At most {bdt(refundable)} — you cannot return money that never arrived.</span>
                </div>
                <div className="wt-field">
                  <label>Date refunded</label>
                  <input className="wt-input" type="date" max={today()} value={refundF.refunded_on}
                    onChange={(e) => setR('refunded_on', e.target.value)} />
                </div>
              </div>

              <div className="wt-grid2">
                <div className="wt-field">
                  <label>How it was returned</label>
                  <select className="wt-select" value={refundF.method} onChange={(e) => setR('method', e.target.value)}>
                    {(ref?.payment_methods || []).map((m) => <option key={m.value}>{m.value}</option>)}
                  </select>
                </div>
                <div className="wt-field">
                  <label>Reference (optional)</label>
                  <input className="wt-input" value={refundF.reference} onChange={(e) => setR('reference', e.target.value)}
                    placeholder="TrxID, cheque number, slip…" />
                </div>
              </div>

              <div className="wt-field">
                <label>Why</label>
                <textarea className="wt-input" rows={2} value={refundF.reason} onChange={(e) => setR('reason', e.target.value)}
                  placeholder="e.g. Client overpaid by ৳2,000 on the August AMC invoice; returned by bKash." />
                <span className="hint">
                  Permanent, and visible on the client's statement. {bdt(refundF.amount || 0)} will go back onto
                  what {inv.client_name} owes.
                </span>
              </div>
            </>
          )}

          {/* The trail. Every movement, including the ones that were undone. */}
          <div style={{ marginTop: 18 }}>
            <div className="wt-sec-title" style={{ marginBottom: 8 }}>Payment history</div>
            {history.length === 0 ? (
              <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Nothing recorded against this invoice yet.</p>
            ) : (
              <table className="wt-tbl">
                <thead><tr>
                  <th style={{ width: 96 }}>Date</th><th style={{ width: 106 }}>Amount</th>
                  <th style={{ width: 108 }}>Method</th><th>Reference / reason</th>
                  <th style={{ width: 110 }}>By</th><th style={{ width: 44 }} />
                </tr></thead>
                <tbody>
                  {history.map((h) => {
                    const kind = h.event_type === 'client_refund' ? 'refund'
                      : num(h.amount) < 0 ? 'reversal' : 'receipt';
                    const undone = history.some((x) => x.reverses_event_id === h.id);
                    return (
                      <tr key={h.id} style={{ opacity: undone ? 0.55 : 1 }}>
                        <td className="muted">{dateFmt(h.received_on)}</td>
                        <td style={{
                          fontWeight: 700,
                          color: kind === 'receipt' ? 'var(--wt-green)' : 'var(--wt-red)',
                          textDecoration: undone ? 'line-through' : undefined,
                        }}>
                          {kind === 'receipt' ? '' : '− '}{bdt(Math.abs(num(h.amount)))}
                        </td>
                        <td className="muted">{h.method || '—'}</td>
                        <td className="muted">
                          <span style={{ fontWeight: 600, color: 'var(--wt-ink-2)' }}>{KIND_LABEL[kind]}</span>
                          {h.batch_ref ? ' · part of one payment across several invoices' : ''}
                          {h.reference ? ` · ${h.reference}` : ''}
                          {h.reversal_reason || h.refund_reason ? ` — ${h.reversal_reason || h.refund_reason}` : ''}
                        </td>
                        <td className="muted">{h.actor || '—'}</td>
                        <td>
                          {kind !== 'reversal' && !undone && (
                            <button className="wt-iconbtn" title="Reverse — this entry was a mistake"
                              disabled={busy === `rev-${h.id}`} onClick={() => reverse(h)}>
                              <Undo2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="wt-modal-foot">
          <button className="wt-btn" style={{ marginRight: 'auto' }} disabled={!!busy || received <= 0}
            onClick={() => { setErr(''); setMode(mode === 'refund' ? 'pay' : 'refund'); }}
            title={received <= 0 ? 'Nothing has been received on this invoice yet' : undefined}>
            <CornerUpLeft size={14} /> {mode === 'refund' ? 'Back to payment' : 'Refund client'}
          </button>
          <button className="wt-btn" onClick={onClose} disabled={!!busy}>Close</button>
          {mode === 'pay' ? (
            !settled && (
              <button className="wt-btn primary" onClick={pay} disabled={!!busy}>
                {busy === 'pay' ? <Loader2 size={14} className="wt-spin" /> : <Check size={14} />}
                {busy === 'pay' ? ' Recording…' : ` Record ${bdt(f.amount || 0)}`}
              </button>
            )
          ) : (
            <button className="wt-btn primary" onClick={refund} disabled={!!busy}
              style={{ background: 'var(--wt-red)', borderColor: 'var(--wt-red)' }}>
              {busy === 'refund' ? <Loader2 size={14} className="wt-spin" /> : <CornerUpLeft size={14} />}
              {busy === 'refund' ? ' Refunding…' : ` Refund ${bdt(refundF.amount || 0)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
