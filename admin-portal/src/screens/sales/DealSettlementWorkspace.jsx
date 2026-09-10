// admin-portal/src/screens/sales/DealSettlementWorkspace.jsx
//
// Mount point: embedded inside the existing deal detail Drawer in
// admin-portal/src/screens/DealsBoard.jsx (the drawer opened by clicking a
// deal row). `dealId` is the only prop passed down — everything else this
// workspace needs (the sales transaction id, the settlement id, the
// property id) is read from the responses below, not from new props.
//
// This workspace drives the EXISTING /sales trust-settlement engine — it no
// longer writes through the interim /deals money endpoints
// (/deals/:id/settlement/*, /deals/:id/disbursements*, /deals/:id/settle).
// It reads its picture from GET /deals/:id/sales-picture (added in Task 1)
// and, once a settlement exists, hydrates the real settlement lines /
// disbursements / transaction parties it needs for its forms from
// GET /sales/properties/:propertyId (the same read SalesPropertyFile.jsx
// uses) plus GET /sales/settlements/:sid/statement for the money totals.
//
// IMPORTANT: the read-model's `badges.payment` / `badges.payout` are always
// null (SaleSettlement has no such columns — see Task 1's report). The
// Payment / Payout badges below are derived here from the statement's
// totals (receipts vs purchase price, disbursed vs outgoing obligations),
// not from those null fields.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select, Spinner, Badge, EmptyState } from '../../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
const arr = (v) => (Array.isArray(v) ? v : []);
const label = (s) => (s == null || s === '' ? '—' : String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

const STATUS_TONE = {
  none: 'grey', draft: 'grey', drafted: 'amber', sent: 'amber', submitted: 'amber', reviewed: 'amber',
  pending: 'amber', prepared: 'amber', processing: 'amber', partial: 'amber', in_progress: 'amber', returned: 'red', failed: 'red',
  signed: 'green', approved: 'green', received: 'green', disbursed: 'green', locked: 'green', paid: 'green', cleared: 'green', reconciled: 'green',
  unreconciled: 'amber', matched: 'amber', rejected: 'red', reversed: 'red',
  cancelled: 'grey',
};

// payments.method ENUM on the backend — keep in sync with server/models/SalesModels.
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'];
// sale_settlement_lines.line_type values that are agency commission/marketing fees
// (agencyFees.service.AGENCY_LINE_TYPES) — these are the ones editFeeLine allows.
const AGENCY_LINE_TYPES = ['commission', 'advertising'];
// sale_settlement_lines.line_type values a payout can be raised against
// (mirrors PAYOUT_LINE_TYPES in SalesPropertyFile.jsx).
const PAYOUT_LINE_TYPES = ['buyer_refund', 'commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'vendor_proceeds', 'rounding'];
// Settlement lifecycle — mirrors backend/utils/salesSettlementCalculations.js TRANSITIONS.
const LIFECYCLE_ACTIONS = [
  { key: 'submit', label: 'Submit', from: ['draft', 'returned'], done: 'Settlement submitted' },
  { key: 'review', label: 'Mark reviewed', from: ['submitted'], done: 'Settlement reviewed' },
  { key: 'approve', label: 'Approve', from: ['reviewed'], done: 'Settlement approved' },
];

// Payment/payout badges from the read-model are always null (no such columns
// on SaleSettlement) — derive a display state from the statement totals instead.
function derivePaymentState(totals) {
  if (!totals) return 'none';
  const receipts = Number(totals.receipts || 0);
  const price = Number(totals.purchase_price || 0);
  if (receipts <= 0) return Number(totals.pending_receipts || 0) > 0 ? 'pending' : 'none';
  if (price > 0 && receipts >= price) return 'received';
  return 'partial';
}
function derivePayoutState(totals) {
  if (!totals) return 'none';
  const obligations = Number(totals.outgoing_obligations || 0);
  const disbursed = Number(totals.disbursed || 0);
  if (obligations > 0 && disbursed >= obligations) return 'disbursed';
  if (disbursed > 0 || Number(totals.pending_disbursements || 0) > 0) return 'in_progress';
  return 'none';
}

export default function DealSettlementWorkspace({ dealId }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [picture, setPicture] = useState(null);
  const [propertyId, setPropertyId] = useState(null);
  const [salesFile, setSalesFile] = useState(null);
  const [statement, setStatement] = useState(null);
  const [partyBankAccounts, setPartyBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [rcv, setRcv] = useState({ transaction_party_id: '', amount: '', reference: '', method: 'bank_transfer' });
  const [payout, setPayout] = useState({ settlement_line_id: '', amount: '', reference: '', proof_url: '', party_bank_account_id: '' });
  const [editing, setEditing] = useState(null); // { id, amount, edit_reason }

  // Guided payout stepper state. A disbursement isn't linked to its outgoing
  // SalePayment on the backend until /pay succeeds, so we track the payment
  // we create for it locally (self-heals via auto-match in linkedPaymentFor
  // if this component remounts before pay).
  const [payoutLinks, setPayoutLinks] = useState({}); // { [disbursementId]: paymentId }
  const [recordFor, setRecordFor] = useState(null); // disbursement id showing the "record payment" form
  const [recordForm, setRecordForm] = useState({});
  const [reconcileFor, setReconcileFor] = useState(null); // payment id showing the "reconcile" form
  const [reconcileForm, setReconcileForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pictureRes = await api.get(`/deals/${dealId}/sales-picture`);
      const pic = pictureRes.data?.data || null;
      setPicture(pic);

      // Property id for the "open the sales file" link. Present on the
      // transaction once linked; otherwise fall back to the deal's own
      // property (read-only lookup — not a /deals money endpoint).
      let propId = pic?.transaction?.property_id || null;
      if (!propId) {
        try {
          const dealRes = await api.get(`/deals/${dealId}`);
          propId = dealRes.data?.data?.Property?.id || dealRes.data?.data?.property_id || null;
        } catch { /* the empty-state link just won't render */ }
      }
      setPropertyId(propId);

      if (pic?.settlement && propId) {
        // Party bank accounts (for selecting a verified payout destination)
        // come from the same read SalesPropertyFile.jsx uses — scoped to the
        // sales transaction, not the property file. Requires ACCOUNTS role on
        // the backend; degrades gracefully (empty list) if denied.
        const [fileRes, stmtRes, bankRes] = await Promise.allSettled([
          api.get(`/sales/properties/${propId}`),
          api.get(`/sales/settlements/${pic.settlement.id}/statement`),
          pic.transaction?.id ? api.get(`/sales/transactions/${pic.transaction.id}/bank-accounts`) : Promise.reject(new Error('no transaction id')),
        ]);
        setSalesFile(fileRes.status === 'fulfilled' ? unwrap(fileRes.value) : null);
        setStatement(stmtRes.status === 'fulfilled' ? unwrap(stmtRes.value) : null);
        setPartyBankAccounts(bankRes.status === 'fulfilled' ? arr(unwrap(bankRes.value)) : []);
      } else {
        setSalesFile(null);
        setStatement(null);
        setPartyBankAccounts([]);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not load the sales picture');
      setPicture(null);
    } finally {
      setLoading(false);
    }
  }, [dealId, toast]);
  useEffect(() => { load(); }, [load]);

  // Returns the response on success (truthy — and callers that need the
  // created record, e.g. the payout stepper, can read res.data) or null on
  // failure, so `if (result)` checks used elsewhere keep working.
  const call = async (fn, ok) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res?.data?.message || ok);
      await load();
      return res;
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!picture) return <div className="card" style={{ padding: 14 }}>Could not load the sales picture.</div>;

  // ---------------------------------------------------------------- linked:false
  if (!picture.linked) {
    return (
      <EmptyState
        title="Accept an offer to open the sales transaction"
        sub={picture.next_action?.label || 'This deal has no linked sales transaction yet — accept a buyer offer on the property to open one.'}
        action={propertyId ? <Button variant="ghost" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open property sales file</Button> : null}
      />
    );
  }

  const tx = picture.transaction;

  // ---------------------------------------------------------- linked, no settlement
  if (!picture.settlement) {
    return (
      <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><strong>Sales transaction</strong> · <Badge tone={STATUS_TONE[tx?.status] || 'grey'}>{label(tx?.status)}</Badge></div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{picture.next_action?.label || 'No settlement statement has been opened yet.'}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button disabled={busy} onClick={() => call(() => api.post(`/sales/transactions/${tx.id}/settlement`, {}), 'Settlement opened')}>Open settlement</Button>
          {propertyId && <Button variant="ghost" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open property sales file</Button>}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- has a settlement
  const settlement = picture.settlement;
  const sid = settlement.id;
  const totals = statement?.totals || null;
  const badges = picture.badges || {};
  const paymentState = derivePaymentState(totals);
  const payoutState = derivePayoutState(totals);

  const lines = salesFile?.settlement?.lines || [];
  const disbursements = salesFile?.settlement?.disbursements || [];
  const payments = salesFile?.settlement?.payments || salesFile?.settlement?.receipts || [];
  const parties = salesFile?.transaction?.parties || salesFile?.active_transaction?.parties || [];
  const buyerParties = parties.filter((p) => p.party_type === 'buyer' && p.status === 'active');
  const partyName = (id) => parties.find((p) => Number(p.id) === Number(id))?.snapshot_name;
  const detailUnavailable = Boolean(picture.settlement) && !salesFile;

  const feeLines = lines.filter((l) => AGENCY_LINE_TYPES.includes(l.line_type));
  const remainingForLine = (line) => Math.max(0, Number(line.amount || 0) - disbursements
    .filter((d) => d.status !== 'cancelled' && Number(d.settlement_line_id) === Number(line.id))
    .reduce((s, d) => s + Number(d.amount || 0), 0));
  const payoutLines = lines.filter((l) => PAYOUT_LINE_TYPES.includes(l.line_type) && remainingForLine(l) > 0);
  const editableFees = ['draft', 'returned'].includes(settlement.status);

  // ---- guided payout stepper helpers ----
  // payee_type/party_type -> SalePayment.payment_kind, mirrors
  // recordOutgoingPaymentFor() in SalesPropertyFile.jsx verbatim.
  const payoutKind = (d) => {
    const party = parties.find((p) => Number(p.id) === Number(d.transaction_party_id));
    if (party?.party_type === 'buyer') return 'buyer_refund';
    if (d.payee_type === 'vendor') return 'vendor_payout';
    if (d.payee_type === 'agency') return 'agency_fee';
    return 'third_party';
  };
  // A disbursement isn't linked to its outgoing payment (payment_id) until
  // /pay succeeds, so before that we either use the id we tracked locally
  // when we created it, or auto-match an unclaimed outgoing payment with the
  // same kind/party/amount (same idea as SalesPropertyFile's eligible-payments filter).
  const linkedPaymentFor = (d) => {
    const linkedId = payoutLinks[d.id] || d.payment_id;
    if (linkedId) return payments.find((p) => Number(p.id) === Number(linkedId)) || null;
    const kind = payoutKind(d);
    const claimed = new Set([
      ...disbursements.filter((x) => x.payment_id).map((x) => Number(x.payment_id)),
      ...Object.values(payoutLinks).map(Number),
    ]);
    return payments.find((p) => p.direction === 'outgoing' && p.payment_kind === kind
      && Number(p.transaction_party_id || 0) === Number(d.transaction_party_id || 0)
      && Number(p.amount) === Number(d.amount)
      && !['rejected', 'reversed'].includes(p.status)
      && !claimed.has(Number(p.id))) || null;
  };
  // create -> record -> clear -> reconcile -> pay. `pay` additionally
  // requires settlement.status === 'approved' — checked separately below so
  // the button can still show while explaining why it's disabled.
  const payoutStepFor = (d) => {
    if (d.status === 'paid') return 'paid';
    if (d.status === 'cancelled') return 'cancelled';
    const payment = linkedPaymentFor(d);
    if (!payment) return 'record';
    if (payment.status === 'pending') return 'clear';
    if (payment.status === 'cleared' && payment.reconciliation_status === 'reconciled' && payment.bank_statement_line_id) return 'pay';
    if (payment.status === 'cleared') return 'reconcile';
    return 'blocked'; // rejected / reversed — needs a fresh payment
  };

  const startEditFee = (line) => setEditing({ id: line.id, amount: line.amount, edit_reason: '' });
  const saveEditFee = () => {
    const reason = String(editing.edit_reason || '').trim();
    if (!reason) { toast.error('A reason is required to change an agreed fee — it is printed on the vendor invoice'); return; }
    // Backend field is `edit_reason` (PATCH /settlement-lines/:id/fee), not `reason`.
    call(() => api.patch(`/sales/settlement-lines/${editing.id}/fee`, { amount: editing.amount, edit_reason: reason }), 'Fee updated')
      .then((ok) => { if (ok) setEditing(null); });
  };

  const submitReceipt = () => {
    if (!rcv.transaction_party_id) { toast.error('Select the buyer'); return; }
    if (!rcv.amount || Number(rcv.amount) <= 0) { toast.error('Enter a positive amount'); return; }
    if (!rcv.reference.trim()) { toast.error('A reference is required'); return; }
    call(() => api.post(`/sales/settlements/${sid}/payments`, {
      direction: 'incoming', payment_kind: 'buyer_receipt', status: 'cleared',
      amount: rcv.amount, reference: rcv.reference, method: rcv.method,
      transaction_party_id: rcv.transaction_party_id, payment_at: new Date().toISOString(),
    }), 'Receipt recorded').then((ok) => { if (ok) setRcv({ transaction_party_id: '', amount: '', reference: '', method: 'bank_transfer' }); });
  };

  // ---- Step 1: create payout ----
  const selectedPayoutLine = lines.find((l) => Number(l.id) === Number(payout.settlement_line_id));
  const selectedPayoutIsAgency = selectedPayoutLine && ['commission', 'advertising', 'agency_fee', 'admin_fee'].includes(selectedPayoutLine.line_type);
  const selectedPayoutContactId = selectedPayoutLine
    ? (parties.find((p) => Number(p.id) === Number(selectedPayoutLine.payee_transaction_party_id))?.contact_id || selectedPayoutLine.payee_contact_id)
    : null;
  const availablePayoutAccounts = partyBankAccounts.filter((a) => a.status === 'verified' && Number(a.contact_id) === Number(selectedPayoutContactId));

  const createPayout = () => {
    const line = lines.find((l) => Number(l.id) === Number(payout.settlement_line_id));
    if (!line) { toast.error('Select an obligation to pay out'); return; }
    const amount = Number(payout.amount || remainingForLine(line));
    if (!amount || amount <= 0) { toast.error('Enter a positive amount'); return; }
    const payload = {
      settlement_line_id: line.id, amount, reference: payout.reference || undefined,
      proof_url: payout.proof_url || undefined, payout_method: 'manual_bank', source_payment_id: null,
    };
    if (line.line_type === 'vendor_proceeds') { payload.payee_type = 'vendor'; payload.transaction_party_id = line.payee_transaction_party_id; }
    else if (['commission', 'advertising', 'agency_fee', 'admin_fee'].includes(line.line_type)) { payload.payee_type = 'agency'; }
    else if (line.line_type === 'buyer_refund') { payload.payee_type = 'third_party'; payload.transaction_party_id = line.payee_transaction_party_id; }
    else { payload.payee_type = 'third_party'; payload.contact_id = line.payee_contact_id || undefined; }

    if (payload.payee_type === 'agency') {
      const destinationId = salesFile?.profile?.agency_bank_account_id;
      if (!destinationId) { toast.error('Configure the agency operating bank account on the sales profile before preparing this payout'); return; }
      payload.destination_bank_account_id = destinationId;
      payload.party_bank_account_id = null;
    } else {
      if (!payout.party_bank_account_id) { toast.error('Select a verified recipient bank account'); return; }
      payload.party_bank_account_id = payout.party_bank_account_id;
      payload.destination_bank_account_id = null;
    }
    if (!window.confirm(`Create a payout of ${money(amount)}? This is a financial action.`)) return;
    call(() => api.post(`/sales/settlements/${sid}/disbursements`, payload), 'Payout created')
      .then((res) => { if (res) setPayout({ settlement_line_id: '', amount: '', reference: '', proof_url: '', party_bank_account_id: '' }); });
  };

  // ---- Step 2: record the outgoing payment for a created payout ----
  const openRecordPayment = (d) => {
    setRecordFor(d.id);
    setRecordForm({
      amount: d.amount, method: 'bank_transfer',
      from_account_name: '', from_account_number: '',
      to_account_name: d.bank_account_name || '', to_account_number: d.bank_account_number || '',
      reference: d.reference || '', proof_url: d.proof_url || '',
      value_date: new Date().toISOString().slice(0, 10),
    });
  };
  const recordOutgoingPayment = (d) => {
    if (settlement.status !== 'approved') { toast.error(`Outgoing payments cannot be recorded while the settlement is ${label(settlement.status)}. Submit, review and approve it first.`); return; }
    const f = recordForm;
    if (!f.amount || Number(f.amount) <= 0) { toast.error('Enter a positive amount'); return; }
    if (!String(f.reference || '').trim()) { toast.error('A reference is required'); return; }
    if (!window.confirm(`Record an outgoing payment of ${money(f.amount)}? This is a financial action.`)) return;
    call(() => api.post(`/sales/settlements/${sid}/payments`, {
      direction: 'outgoing', payment_kind: payoutKind(d), transaction_party_id: d.transaction_party_id || null,
      payment_at: new Date().toISOString(), value_date: f.value_date, amount: f.amount, method: f.method,
      from_account_name: f.from_account_name, from_account_number: f.from_account_number,
      to_account_name: f.to_account_name, to_account_number: f.to_account_number,
      reference: f.reference, proof_url: f.proof_url, status: 'pending',
      idempotency_key: `payout-payment-${d.id}-${Date.now()}`,
    }), 'Outgoing payment recorded').then((res) => {
      if (!res) return;
      const created = res.data?.data || res.data;
      if (created?.id) setPayoutLinks((prev) => ({ ...prev, [d.id]: created.id }));
      setRecordFor(null);
    });
  };

  // ---- Step 3: clear the payment ----
  const clearPaymentNow = (payment) => {
    if (!window.confirm(`Clear payment ${payment.reference || `#${payment.id}`}? This is a financial action.`)) return;
    call(() => api.post(`/sales/payments/${payment.id}/clear`, {}), 'Payment cleared');
  };

  // ---- Step 4: reconcile against the bank statement ----
  const openReconcile = (payment) => {
    setReconcileFor(payment.id);
    setReconcileForm({ statement_url: payment.statement_url || '', bank_statement_line_id: payment.bank_statement_line_id || '', note: '' });
  };
  const reconcilePaymentNow = (payment) => {
    const f = reconcileForm;
    if (!String(f.statement_url || '').trim()) { toast.error('An uploaded bank statement document is required to reconcile'); return; }
    if (!f.bank_statement_line_id) { toast.error('Enter the matched trust-bank statement line ID — import and match the statement in the full Sales Property File first if you do not have one yet'); return; }
    if (!window.confirm(`Reconcile payment ${payment.reference || `#${payment.id}`} against the bank statement?`)) return;
    call(() => api.post(`/sales/payments/${payment.id}/reconcile`, {
      reconciliation_status: 'reconciled', statement_url: f.statement_url,
      bank_statement_line_id: Number(f.bank_statement_line_id), note: f.note || undefined,
    }), 'Payment reconciled').then((res) => { if (res) setReconcileFor(null); });
  };

  // ---- Step 5: pay the disbursement — GATED on an approved settlement and a
  // cleared + reconciled outgoing payment. Never weaken this check. ----
  const payDisbursementNow = (d, payment) => {
    if (settlement.status !== 'approved') { toast.error(`This payout cannot be marked paid while the settlement is ${label(settlement.status)}. Submit, review and approve it first.`); return; }
    if (!payment || payment.status !== 'cleared' || payment.reconciliation_status !== 'reconciled' || !payment.bank_statement_line_id) { toast.error('The outgoing payment must be cleared and reconciled to the bank statement before this payout can be paid'); return; }
    if (!window.confirm(`Confirm ${money(d.amount)} was paid to ${partyName(d.transaction_party_id) || label(d.payee_type)}? This is a financial action.`)) return;
    call(() => api.post(`/sales/disbursements/${d.id}/pay`, { payment_id: payment.id, proof_url: d.proof_url || undefined }), 'Payout marked paid')
      .then((res) => { if (res) setPayoutLinks((prev) => { const next = { ...prev }; delete next[d.id]; return next; }); });
  };

  // ---- Optional parallel step: submit the transfer attempt ----
  const submitPayoutTransfer = (d) => {
    if (settlement.status !== 'approved') { toast.error('Submitting a payout transfer requires an approved settlement.'); return; }
    const reference = d.reference || window.prompt('Reference for this transfer:');
    if (!reference) return;
    if (!window.confirm(`Submit the ${money(d.amount)} payout transfer?`)) return;
    call(() => api.post(`/sales/disbursements/${d.id}/submit`, {
      reference, proof_url: d.proof_url || undefined,
      idempotency_key: `payout-${d.id}-attempt-${Number(d.attempt_count || 0) + 1}`,
    }), d.status === 'failed' ? 'Payout resubmitted' : 'Payout submitted');
  };

  const cancelPayout = (d) => {
    const reason = window.prompt('Reason for cancelling this payout:');
    if (!reason || !reason.trim()) return;
    call(() => api.post(`/sales/disbursements/${d.id}/cancel`, { reason: reason.trim() }), 'Payout cancelled');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Contract', badges.contract], ['Settlement', settlement.status], ['Payment', paymentState], ['Payout', payoutState]].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{k}</div>
            <Badge tone={STATUS_TONE[v] || 'grey'}>{label(v)}</Badge>
          </div>
        ))}
      </div>

      {picture.next_action && <div className="card" style={{ padding: 12, borderLeft: '3px solid #0284c7' }}><strong>Next:</strong> {picture.next_action.label}</div>}
      {detailUnavailable && <div className="card" style={{ padding: 12, borderLeft: '3px solid #f59e0b' }}>Could not load settlement line/payout detail — some actions below may be limited. <Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>}
      {propertyId && <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open full sales file →</Button>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          ['Agreed fees', picture.money?.drafted_fees?.total_amount],
          ['Receipts', totals?.receipts],
          ['Disbursed', totals?.disbursed],
          ['Outstanding', totals?.unpaid_obligations],
          ['Funds held', totals?.funds_held],
        ].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '10px 14px', minWidth: 130 }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{k}</div>
            <div style={{ fontWeight: 800 }}>{money(v)}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Agency fees</strong>
        {picture.money?.drafted_fees?.terms && <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#64748b' }}>{picture.money.drafted_fees.terms}</p>}
        {!feeLines.length ? (
          <p style={{ fontSize: 13, color: '#64748b' }}>No settlement fee lines loaded yet.</p>
        ) : (
          <table className="tbl"><tbody>
            {feeLines.map((l) => (
              <tr key={l.id}>
                <td>{label(l.line_type)}</td>
                <td style={{ textAlign: 'right' }}>{money(l.amount)}</td>
                <td>{editableFees && <Button size="sm" variant="ghost" onClick={() => startEditFee(l)}>Edit</Button>}</td>
              </tr>
            ))}
          </tbody></table>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="New amount"><Input type="number" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></Field>
            <Field label="Reason (required)"><Input value={editing.edit_reason} onChange={(e) => setEditing({ ...editing, edit_reason: e.target.value })} /></Field>
            <Button disabled={busy} onClick={saveEditFee}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        )}
        {editableFees && feeLines.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => call(() => api.post(`/sales/settlements/${sid}/vendor-invoice`, {}), 'Vendor invoice issued')}>Issue vendor invoice</Button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Receive buyer money</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', marginTop: 8 }}>
          <Field label="Buyer">
            <Select value={rcv.transaction_party_id} onChange={(e) => setRcv({ ...rcv, transaction_party_id: e.target.value })}>
              <option value="">Select buyer…</option>
              {buyerParties.map((p) => <option key={p.id} value={p.id}>{p.snapshot_name}</option>)}
            </Select>
          </Field>
          <Field label="Amount"><Input type="number" value={rcv.amount} onChange={(e) => setRcv({ ...rcv, amount: e.target.value })} /></Field>
          <Field label="Reference"><Input value={rcv.reference} onChange={(e) => setRcv({ ...rcv, reference: e.target.value })} /></Field>
          <Field label="Method">
            <Select value={rcv.method} onChange={(e) => setRcv({ ...rcv, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
            </Select>
          </Field>
          <Button disabled={busy || settlement.status === 'locked'} onClick={submitReceipt}>Record receipt</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Payouts</strong>
        <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#64748b' }}>
          Guided flow: create the payout → record its outgoing payment → clear it → reconcile it to the bank statement → pay.
          Paying always requires an approved settlement and a cleared, reconciled payment.
        </p>
        {editableFees && (
          <div className="card" style={{ padding: 10, margin: '8px 0', background: 'var(--surface-2, #f8fafc)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Step 1 · Create payout</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <Field label="Obligation">
                <Select
                  value={payout.settlement_line_id}
                  onChange={(e) => {
                    const line = lines.find((l) => Number(l.id) === Number(e.target.value));
                    setPayout({ ...payout, settlement_line_id: e.target.value, amount: line ? remainingForLine(line) : '', party_bank_account_id: '' });
                  }}
                >
                  <option value="">Select…</option>
                  {payoutLines.map((l) => <option key={l.id} value={l.id}>{label(l.line_type)} — {money(remainingForLine(l))} remaining</option>)}
                </Select>
              </Field>
              <Field label="Amount"><Input type="number" value={payout.amount} onChange={(e) => setPayout({ ...payout, amount: e.target.value })} /></Field>
              <Field label="Reference"><Input value={payout.reference} onChange={(e) => setPayout({ ...payout, reference: e.target.value })} /></Field>
              {selectedPayoutLine && !selectedPayoutIsAgency && (
                <Field label="Recipient bank account">
                  <Select value={payout.party_bank_account_id} onChange={(e) => setPayout({ ...payout, party_bank_account_id: e.target.value })}>
                    <option value="">Select verified account…</option>
                    {availablePayoutAccounts.map((a) => <option key={a.id} value={a.id}>{a.bank_name} · {a.account_name} · {a.masked_account_number || a.account_number}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Proof URL (optional)"><Input value={payout.proof_url} onChange={(e) => setPayout({ ...payout, proof_url: e.target.value })} /></Field>
              <Button disabled={busy} onClick={createPayout}>Create payout</Button>
            </div>
            {selectedPayoutLine && selectedPayoutIsAgency && (
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                Pays to the agency operating account{salesFile?.profile?.agency_bank_account_id ? ` (#${salesFile.profile.agency_bank_account_id})` : ' — not configured on the sales profile yet'}.
              </p>
            )}
            {selectedPayoutLine && !selectedPayoutIsAgency && !availablePayoutAccounts.length && (
              <p style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>No verified bank account for this payee yet — add and verify one in the full Sales Property File.</p>
            )}
          </div>
        )}
        <table className="tbl">
          <thead><tr><th>Payout</th><th>Payee</th><th style={{ textAlign: 'right' }}>Amount</th><th>Payout status</th><th>Payment status</th><th></th></tr></thead>
          <tbody>
          {disbursements.map((d) => {
            const step = payoutStepFor(d);
            const payment = linkedPaymentFor(d);
            return (
              <React.Fragment key={d.id}>
                <tr>
                  <td>{d.reference || `#${d.id}`}</td>
                  <td>{['vendor', 'third_party'].includes(d.payee_type) ? (partyName(d.transaction_party_id) || label(d.payee_type)) : label(d.payee_type)}</td>
                  <td style={{ textAlign: 'right' }}>{money(d.amount)}</td>
                  <td><Badge tone={STATUS_TONE[d.status] || 'grey'}>{label(d.status)}</Badge></td>
                  <td>
                    {payment
                      ? <Badge tone={STATUS_TONE[payment.reconciliation_status === 'reconciled' ? 'reconciled' : payment.status] || 'grey'}>{label(payment.status)}{payment.reconciliation_status === 'reconciled' ? ' · reconciled' : ''}</Badge>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>{step === 'record' ? 'No payment yet' : '—'}</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {step === 'record' && <Button size="sm" disabled={busy || settlement.status !== 'approved'} onClick={() => openRecordPayment(d)}>Record payment</Button>}
                    {step === 'clear' && <Button size="sm" disabled={busy} onClick={() => clearPaymentNow(payment)}>Clear payment</Button>}
                    {step === 'reconcile' && <Button size="sm" disabled={busy} onClick={() => openReconcile(payment)}>Reconcile</Button>}
                    {step === 'pay' && <Button size="sm" disabled={busy || settlement.status !== 'approved'} onClick={() => payDisbursementNow(d, payment)}>Pay</Button>}
                    {settlement.status === 'approved' && ['pending', 'prepared', 'failed'].includes(d.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => submitPayoutTransfer(d)}>Submit transfer</Button>}
                    {editableFees && ['pending', 'prepared', 'failed'].includes(d.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => cancelPayout(d)}>Cancel</Button>}
                  </td>
                </tr>
                {recordFor === d.id && (
                  <tr><td colSpan={6}>
                    <div className="card" style={{ padding: 10, background: 'var(--surface-2, #f8fafc)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, flexBasis: '100%' }}>Step 2 · Record the outgoing payment</div>
                      <Field label="Amount"><Input type="number" value={recordForm.amount} onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })} /></Field>
                      <Field label="Method">
                        <Select value={recordForm.method} onChange={(e) => setRecordForm({ ...recordForm, method: e.target.value })}>
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
                        </Select>
                      </Field>
                      <Field label="From account name"><Input value={recordForm.from_account_name} onChange={(e) => setRecordForm({ ...recordForm, from_account_name: e.target.value })} /></Field>
                      <Field label="From account number"><Input value={recordForm.from_account_number} onChange={(e) => setRecordForm({ ...recordForm, from_account_number: e.target.value })} /></Field>
                      <Field label="To account name"><Input value={recordForm.to_account_name} onChange={(e) => setRecordForm({ ...recordForm, to_account_name: e.target.value })} /></Field>
                      <Field label="To account number"><Input value={recordForm.to_account_number} onChange={(e) => setRecordForm({ ...recordForm, to_account_number: e.target.value })} /></Field>
                      <Field label="Reference"><Input value={recordForm.reference} onChange={(e) => setRecordForm({ ...recordForm, reference: e.target.value })} /></Field>
                      <Field label="Value date"><Input type="date" value={recordForm.value_date} onChange={(e) => setRecordForm({ ...recordForm, value_date: e.target.value })} /></Field>
                      <Field label="Proof URL (optional)"><Input value={recordForm.proof_url} onChange={(e) => setRecordForm({ ...recordForm, proof_url: e.target.value })} /></Field>
                      <Button disabled={busy} onClick={() => recordOutgoingPayment(d)}>Record outgoing payment</Button>
                      <Button variant="ghost" onClick={() => setRecordFor(null)}>Cancel</Button>
                    </div>
                  </td></tr>
                )}
                {payment && reconcileFor === payment.id && (
                  <tr><td colSpan={6}>
                    <div className="card" style={{ padding: 10, background: 'var(--surface-2, #f8fafc)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, flexBasis: '100%' }}>Step 4 · Reconcile against the bank statement</div>
                      <Field label="Bank statement document"><Input value={reconcileForm.statement_url} onChange={(e) => setReconcileForm({ ...reconcileForm, statement_url: e.target.value })} placeholder="/uploads/documents/…" /></Field>
                      <Field label="Matched bank statement line ID"><Input type="number" value={reconcileForm.bank_statement_line_id} onChange={(e) => setReconcileForm({ ...reconcileForm, bank_statement_line_id: e.target.value })} placeholder="Import & match in the full Sales Property File first" /></Field>
                      <Field label="Note (optional)"><Input value={reconcileForm.note} onChange={(e) => setReconcileForm({ ...reconcileForm, note: e.target.value })} /></Field>
                      <Button disabled={busy} onClick={() => reconcilePaymentNow(payment)}>Reconcile</Button>
                      <Button variant="ghost" onClick={() => setReconcileFor(null)}>Cancel</Button>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
          {!disbursements.length && <tr><td colSpan={6} style={{ color: '#64748b', fontSize: 13 }}>No payouts yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ marginRight: 8 }}>Settlement lifecycle</strong>
        {LIFECYCLE_ACTIONS.filter((a) => a.from.includes(settlement.status)).map((a) => (
          <Button key={a.key} disabled={busy} onClick={() => call(() => api.post(`/sales/settlements/${sid}/${a.key}`, {}), a.done)}>{a.label}</Button>
        ))}
        {!LIFECYCLE_ACTIONS.some((a) => a.from.includes(settlement.status)) && <span style={{ fontSize: 13, color: '#64748b' }}>No lifecycle action available while {label(settlement.status)}.</span>}
      </div>
    </div>
  );
}
