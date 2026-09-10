// admin-portal/src/screens/sales/settlement-desk/RecordMoneyView.jsx
//
// View 3 — Record money. Capture-once money in and out.
//  • Receive: a buyer receipt prefilled from the due obligation (payer = primary
//    buyer, amount = remaining due). One save records + posts + trust-receipts.
//  • Pay: one row per payable line/disbursement with a single "Pay out" that
//    chains create → record → clear, resuming from wherever a prior attempt
//    stopped; then "Match bank" (jumps to view 4) and "Mark paid" once matched.
//  Every gate stays server-side; granular manual controls live under Advanced.
import React, { useState } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input, Field, Select, Badge } from '../../../ui/kit';
import {
  money, label, deskRoles, PROGRESS, PAYMENT_METHODS,
  remainingForLine, payeeDisplayName, payoutStepFor, makeLinkedPaymentFor,
  buildDisbursementPayload, buildPaymentPayload, PAYOUT_LINE_TYPES, unwrap,
} from './settlementMoney';

export default function RecordMoneyView({ picture, desk, goView }) {
  const { user } = useAuth();
  const { canAccounts } = deskRoles(user);
  const [payoutLinks, setPayoutLinks] = useState({});
  const [chainError, setChainError] = useState(null);
  const [busy, setBusy] = useState(false);

  const primaryBuyer = picture.parties.find((p) => p.party_type === 'buyer' && p.is_primary)
    || picture.parties.find((p) => p.party_type === 'buyer');
  const totals = picture.statement?.totals || {};
  const remainingDue = Math.max(0, Number(totals.purchase_price || 0) - Number(totals.receipts || 0));

  const [rcv, setRcv] = useState({ amount: '', reference: '', method: 'bank_transfer', proof_url: '' });

  if (!picture.settlement) return <div className="pm-card card-pad">No settlement yet.</div>;
  const sid = picture.settlement.id;
  const status = picture.settlement.status;
  const locked = status === 'locked';

  const linkedPaymentFor = makeLinkedPaymentFor({
    payments: picture.payments, disbursements: picture.disbursements, parties: picture.parties, payoutLinks,
  });

  // ---- Receive (capture-once) ----
  const recordReceipt = () => {
    if (!primaryBuyer) { return; }
    const amount = rcv.amount === '' ? remainingDue : rcv.amount;
    desk.call(() => api.post(`/sales/settlements/${sid}/payments`, {
      direction: 'incoming', payment_kind: 'buyer_receipt',
      transaction_party_id: primaryBuyer.id, amount,
      reference: rcv.reference, method: rcv.method, proof_url: rcv.proof_url || undefined,
      status: 'cleared',
    }), 'Receipt recorded').then((ok) => { if (ok) setRcv({ amount: '', reference: '', method: 'bank_transfer', proof_url: '' }); });
  };

  // ---- Pay rows ----
  const editableFees = ['draft', 'returned'].includes(status);
  const payoutLines = picture.lines.filter((l) => PAYOUT_LINE_TYPES.includes(l.line_type) && remainingForLine(l, picture.disbursements) > 0);
  const payableRows = [
    ...picture.disbursements.map((d) => ({ kind: 'disbursement', id: `d${d.id}`, d })),
    ...(editableFees ? payoutLines.map((l) => ({ kind: 'line', id: `l${l.id}`, l })) : []),
  ];

  const payoutDeps = {
    agencyBankAccountId: picture.profile?.agency_bank_account_id,
    partyBankAccounts: picture.partyBankAccounts,
    parties: picture.parties,
    disbursements: picture.disbursements,
  };

  // One-click "Pay out": create → record → clear, resuming from the row's step.
  const startPayout = async (row) => {
    const step = row.kind === 'line' ? 'create' : payoutStepFor(row.d, linkedPaymentFor);
    if (!['create', 'record', 'clear'].includes(step)) return;
    const payeeLabel = row.kind === 'line' ? payeeDisplayName(row.l, picture.parties) : (payeeDisplayName({ line_type: row.d.payee_type, payee_transaction_party_id: row.d.transaction_party_id }, picture.parties));
    const amount = row.kind === 'line' ? remainingForLine(row.l, picture.disbursements) : row.d.amount;
    if (!window.confirm(`Pay out ${money(amount)} to ${payeeLabel}?`)) return;

    setBusy(true); setChainError(null);
    let disbursement = row.kind === 'disbursement' ? row.d : null;
    let payment = row.kind === 'disbursement' ? linkedPaymentFor(row.d) : null;
    let cur = step;
    try {
      if (cur === 'create') {
        const built = buildDisbursementPayload(row.l, payoutDeps);
        if (built.error) { setChainError({ rowKey: row.id, message: built.error }); return; }
        disbursement = unwrap(await api.post(`/sales/settlements/${sid}/disbursements`, built.payload));
        cur = 'record';
      }
      if (cur === 'record') {
        payment = unwrap(await api.post(`/sales/settlements/${sid}/payments`, buildPaymentPayload(disbursement, picture.parties)));
        setPayoutLinks((prev) => ({ ...prev, [disbursement.id]: payment.id }));
        cur = 'clear';
      }
      if (cur === 'clear') {
        await api.post(`/sales/payments/${payment.id}/clear`, {});
      }
    } catch (e) {
      setChainError({ rowKey: row.id, message: e.response?.data?.error || 'Payout step failed' });
    } finally {
      setBusy(false);
      await desk.refetch();
    }
  };

  const markPaid = (d, payment) => {
    if (!window.confirm(`Confirm ${money(d.amount)} was paid?`)) return;
    desk.call(() => api.post(`/sales/disbursements/${d.id}/pay`, { payment_id: payment.id, proof_url: d.proof_url || undefined }), 'Payout marked paid');
  };
  const cancelPayout = (d) => {
    const reason = window.prompt('Reason for cancelling this payout:');
    if (!reason || !reason.trim()) return;
    desk.call(() => api.post(`/sales/disbursements/${d.id}/cancel`, { reason: reason.trim() }), 'Payout cancelled');
  };

  // The primary button for a payable row, following its step.
  const renderRow = (row) => {
    const d = row.d;
    const step = row.kind === 'line' ? 'create' : payoutStepFor(d, linkedPaymentFor);
    const payment = row.kind === 'disbursement' ? linkedPaymentFor(d) : null;
    const [pLabel, pTone] = PROGRESS[step] || ['—', 'grey'];
    const amount = row.kind === 'line' ? remainingForLine(row.l, picture.disbursements) : d.amount;
    const name = row.kind === 'line' ? payeeDisplayName(row.l, picture.parties) : (payeeDisplayName({ line_type: d.payee_type === 'agency' ? 'commission' : (d.payee_type === 'vendor' ? 'vendor_proceeds' : 'third_party'), payee_transaction_party_id: d.transaction_party_id }, picture.parties));
    return (
      <tr key={row.id}>
        <td>{name}</td>
        <td style={{ textAlign: 'right' }} className="pm-num">{money(amount)}</td>
        <td><Badge tone={pTone}>{pLabel}</Badge></td>
        <td style={{ textAlign: 'right' }}>
          {!canAccounts || locked ? null
            : ['create', 'record', 'clear'].includes(step) ? <Button size="sm" disabled={busy} onClick={() => startPayout(row)}>Pay out</Button>
            : step === 'reconcile' ? <Button size="sm" variant="secondary" onClick={() => goView('match')}>Match bank</Button>
            : step === 'pay' ? <Button size="sm" onClick={() => markPaid(d, payment)}>Mark paid</Button>
            : step === 'paid' ? <span className="cell-sub">Paid</span>
            : step === 'blocked' ? <Button size="sm" variant="ghost" onClick={() => cancelPayout(d)}>Cancel &amp; retry</Button>
            : null}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Receive */}
      <div className="pm-card card-pad">
        <h3 style={{ marginTop: 0 }}>Receive money (buyer)</h3>
        {!primaryBuyer ? <p className="cell-sub">No active buyer party on this transaction.</p> : (
          <>
            <p className="cell-sub">Payer: <strong>{primaryBuyer.snapshot_name}</strong> · Remaining due: <strong className="pm-num">{money(remainingDue)}</strong></p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Field label={`Amount (default remaining due ${money(remainingDue)})`}>
                <Input type="number" step="0.01" value={rcv.amount} placeholder={String(remainingDue)} onChange={(e) => setRcv({ ...rcv, amount: e.target.value })} />
              </Field>
              <Field label="Reference" required>
                <Input value={rcv.reference} onChange={(e) => setRcv({ ...rcv, reference: e.target.value })} />
              </Field>
              <Field label="Method">
                <Select value={rcv.method} onChange={(e) => setRcv({ ...rcv, method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
                </Select>
              </Field>
              <Field label="Proof URL (optional)">
                <Input value={rcv.proof_url} onChange={(e) => setRcv({ ...rcv, proof_url: e.target.value })} placeholder="/uploads/documents/…" />
              </Field>
              <Button disabled={!canAccounts || locked || !rcv.reference.trim()} onClick={recordReceipt}>Record receipt</Button>
            </div>
            {!canAccounts && <p className="cell-sub">Recording money requires the accounts role.</p>}
          </>
        )}
      </div>

      {/* Pay */}
      <div className="pm-card card-pad">
        <h3 style={{ marginTop: 0 }}>{picture.settlement.settlement_type === 'withdrawal' ? 'Refund money out' : 'Pay money out'}</h3>
        {status !== 'approved' && (
          <p className="cell-sub">Payouts can be prepared now, but money only leaves the trust account after the settlement is approved.</p>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Payee</th><th style={{ textAlign: 'right' }}>Amount</th><th>Progress</th><th /></tr></thead>
            <tbody>
              {payableRows.length === 0 ? <tr><td colSpan={4} className="cell-sub">No payable obligations.</td></tr> : payableRows.map(renderRow)}
            </tbody>
          </table>
        </div>
        {chainError && (
          <div className="st-notice st-notice-error" style={{ marginTop: 8 }}>{chainError.message}</div>
        )}
        <p className="cell-sub" style={{ marginTop: 8 }}>
          “Pay out” records and clears the outgoing payment; then match it to the bank statement and mark it paid. Every step is server-gated.
        </p>
      </div>
    </div>
  );
}
