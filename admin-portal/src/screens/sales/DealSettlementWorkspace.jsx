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
//
// PAYOUT UX: paying a payable line is ONE click ("Pay out"). It chains
// create-disbursement -> record-outgoing-payment -> clear-payment behind a
// single confirmation, resuming from wherever an earlier attempt stopped.
// The only steps left as separate, explicit actions are "Match bank"
// (needs a real bank_statement_line_id — never fabricated) and, once
// matched, "Mark paid". Every backend call and gate below is unchanged;
// only the number of clicks/dialogs to reach them is collapsed. Granular
// per-step controls, transfer submission, cancellation and raw
// disbursement/payment ids live under the "Advanced" disclosure.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
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

// One-click payout progress, keyed by payoutStepFor()'s return value.
const PROGRESS = {
  create: ['Ready', 'grey'],
  record: ['Prepared', 'amber'],
  clear: ['Payment pending', 'amber'],
  reconcile: ['Awaiting bank match', 'amber'],
  pay: ['Matched', 'blue'],
  paid: ['Paid', 'green'],
  cancelled: ['Cancelled', 'grey'],
  blocked: ['Payment rejected', 'red'],
};
const STEP_LABEL = { create: 'Create payout', record: 'Record payment', clear: 'Clear payment' };

// payments.method ENUM on the backend — keep in sync with server/models/SalesModels.
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'];
// sale_settlement_lines.line_type values that are agency commission/marketing fees
// (agencyFees.service.AGENCY_LINE_TYPES) — these are the ones editFeeLine allows.
const AGENCY_LINE_TYPES = ['commission', 'advertising'];
// sale_settlement_lines.line_type values a payout can be raised against
// (mirrors PAYOUT_LINE_TYPES in SalesPropertyFile.jsx).
const PAYOUT_LINE_TYPES = ['buyer_refund', 'commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'vendor_proceeds', 'rounding'];
// Settlement lifecycle — mirrors backend/utils/salesSettlementCalculations.js TRANSITIONS.
// `role` says which client-side role flag gates the button: submit/review are
// accounts actions, approve is admin-only (mirrors SalesPropertyFile.jsx's
// canAccounts/canAdmin split).
const LIFECYCLE_ACTIONS = [
  { key: 'submit', label: 'Submit', from: ['draft', 'returned'], done: 'Settlement submitted', role: 'accounts' },
  { key: 'review', label: 'Mark reviewed', from: ['submitted'], done: 'Settlement reviewed', role: 'accounts' },
  { key: 'approve', label: 'Approve', from: ['reviewed'], done: 'Settlement approved', role: 'admin' },
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
  const { user } = useAuth();
  // Same three role flags as SalesPropertyFile.jsx (copied verbatim) — the
  // backend's roleMiddleware already enforces these; this just keeps buttons
  // the user's role can't use from rendering at all.
  const canPrepare = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'].includes(user?.role);
  const canAccounts = ['super_admin', 'branch_admin', 'accounts'].includes(user?.role);
  const canAdmin = ['super_admin', 'branch_admin'].includes(user?.role);
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

  // A disbursement isn't linked to its outgoing SalePayment on the backend
  // until /pay succeeds, so we track the payment we create for it locally
  // (self-heals via auto-match in linkedPaymentFor if this component
  // remounts before pay).
  const [payoutLinks, setPayoutLinks] = useState({}); // { [disbursementId]: paymentId }
  const [recordFor, setRecordFor] = useState(null); // Advanced: disbursement id showing the manual "record payment" form
  const [recordForm, setRecordForm] = useState({});
  const [reconcileFor, setReconcileFor] = useState(null); // payment id showing the "Match bank" form
  const [reconcileForm, setReconcileForm] = useState({});
  const [chainError, setChainError] = useState(null); // { rowKey, step, message } — which "Pay out" step failed, for Retry

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
        // Party bank accounts (for auto-picking a verified payout
        // destination) come from the same read SalesPropertyFile.jsx uses —
        // scoped to the sales transaction, not the property file. Requires
        // ACCOUNTS role on the backend; degrades gracefully (empty list) if
        // denied.
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
  // created record can read res.data) or null on failure, so `if (result)`
  // checks used elsewhere keep working.
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
  if (!picture) return <div className="card card-pad">Could not load the sales picture.</div>;

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
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><strong>Sales transaction</strong> · <Badge tone={STATUS_TONE[tx?.status] || 'grey'}>{label(tx?.status)}</Badge></div>
        <p className="cell-sub" style={{ margin: 0 }}>{picture.next_action?.label || 'No settlement statement has been opened yet.'}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canPrepare && (
            <Button
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Open the settlement statement for this transaction?')) return;
                call(() => api.post(`/sales/transactions/${tx.id}/settlement`, {}), 'Settlement opened');
              }}
            >
              Open settlement
            </Button>
          )}
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
  // Disbursements can only be prepared while the settlement is draft/returned
  // (backend-enforced) — an untouched obligation has no path to a payout
  // once the settlement has moved on, same as before this redesign.
  const editableFees = ['draft', 'returned'].includes(settlement.status);

  // ---- payee_type/transaction_party_id/contact_id for a settlement line,
  // mirrors the backend's disbursementMatchesLine rules. Shared by the
  // one-click chain's auto-picked defaults and the Advanced manual form. ----
  const payeeFieldsForLine = (line) => {
    if (line.line_type === 'vendor_proceeds') return { payee_type: 'vendor', transaction_party_id: line.payee_transaction_party_id };
    if (['commission', 'advertising', 'agency_fee', 'admin_fee'].includes(line.line_type)) return { payee_type: 'agency' };
    if (line.line_type === 'buyer_refund') return { payee_type: 'third_party', transaction_party_id: line.payee_transaction_party_id };
    return { payee_type: 'third_party', contact_id: line.payee_contact_id || undefined };
  };
  const payeeContactId = (line) => {
    const f = payeeFieldsForLine(line);
    return f.transaction_party_id ? parties.find((p) => Number(p.id) === Number(f.transaction_party_id))?.contact_id : f.contact_id;
  };
  const payeeDisplayName = (line) => {
    const f = payeeFieldsForLine(line);
    if (f.payee_type === 'agency') return 'Agency (Seventh Sky)';
    if (f.transaction_party_id) return partyName(f.transaction_party_id) || label(line.line_type);
    return label(line.line_type);
  };

  // ---- guided payout helpers ----
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
  // create -> record -> clear -> reconcile -> pay. "Pay out" collapses
  // create/record/clear into one click; reconcile ("Match bank") and pay
  // ("Mark paid") stay explicit. `pay` additionally requires
  // settlement.status === 'approved' — checked separately below so the
  // button can still show while explaining why it's disabled. NEVER weaken
  // these gates.
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
    if (!window.confirm(`Change this agreed fee to ${money(editing.amount)}?`)) return;
    // Backend field is `edit_reason` (PATCH /settlement-lines/:id/fee), not `reason`.
    call(() => api.patch(`/sales/settlement-lines/${editing.id}/fee`, { amount: editing.amount, edit_reason: reason }), 'Fee updated')
      .then((ok) => { if (ok) setEditing(null); });
  };

  const submitReceipt = () => {
    if (!rcv.transaction_party_id) { toast.error('Select the buyer'); return; }
    if (!rcv.amount || Number(rcv.amount) <= 0) { toast.error('Enter a positive amount'); return; }
    if (!rcv.reference.trim()) { toast.error('A reference is required'); return; }
    if (!window.confirm(`Record a receipt of ${money(rcv.amount)}?`)) return;
    call(() => api.post(`/sales/settlements/${sid}/payments`, {
      direction: 'incoming', payment_kind: 'buyer_receipt', status: 'cleared',
      amount: rcv.amount, reference: rcv.reference, method: rcv.method,
      transaction_party_id: rcv.transaction_party_id, payment_at: new Date().toISOString(),
    }), 'Receipt recorded').then((ok) => { if (ok) setRcv({ transaction_party_id: '', amount: '', reference: '', method: 'bank_transfer' }); });
  };

  // ---- Advanced: create a payout manually (custom amount/reference/bank account) ----
  const selectedPayoutLine = lines.find((l) => Number(l.id) === Number(payout.settlement_line_id));
  const selectedPayoutIsAgency = selectedPayoutLine && payeeFieldsForLine(selectedPayoutLine).payee_type === 'agency';
  const availablePayoutAccounts = selectedPayoutLine
    ? partyBankAccounts.filter((a) => a.status === 'verified' && Number(a.contact_id) === Number(payeeContactId(selectedPayoutLine)))
    : [];

  const createPayout = () => {
    const line = lines.find((l) => Number(l.id) === Number(payout.settlement_line_id));
    if (!line) { toast.error('Select an obligation to pay out'); return; }
    const amount = Number(payout.amount || remainingForLine(line));
    if (!amount || amount <= 0) { toast.error('Enter a positive amount'); return; }
    const payload = { settlement_line_id: line.id, amount, reference: payout.reference || undefined, proof_url: payout.proof_url || undefined, payout_method: 'manual_bank', source_payment_id: null, ...payeeFieldsForLine(line) };
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
    if (!window.confirm(`Create a payout of ${money(amount)}?`)) return;
    call(() => api.post(`/sales/settlements/${sid}/disbursements`, payload), 'Payout created')
      .then((res) => { if (res) setPayout({ settlement_line_id: '', amount: '', reference: '', proof_url: '', party_bank_account_id: '' }); });
  };

  // ---- Advanced: record the outgoing payment for a payout by hand ----
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
    if (settlement.status !== 'approved') { toast.error(`Outgoing payments cannot be recorded while the settlement is ${label(settlement.status)}.`); return; }
    const f = recordForm;
    if (!f.amount || Number(f.amount) <= 0) { toast.error('Enter a positive amount'); return; }
    if (!String(f.reference || '').trim()) { toast.error('A reference is required'); return; }
    if (!window.confirm(`Record an outgoing payment of ${money(f.amount)}?`)) return;
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

  // ---- Advanced: clear a payment by hand (the "Pay out" chain does this too) ----
  const clearPaymentNow = (payment) => {
    if (!window.confirm(`Clear payment ${payment.reference || `#${payment.id}`}?`)) return;
    call(() => api.post(`/sales/payments/${payment.id}/clear`, {}), 'Payment cleared');
  };

  // ---- Match bank: the one step that stays manual — it needs real bank
  // evidence and is never auto-created. ----
  const openReconcile = (payment) => {
    setReconcileFor(payment.id);
    setReconcileForm({ statement_url: payment.statement_url || '', bank_statement_line_id: payment.bank_statement_line_id || '' });
  };
  const reconcilePaymentNow = (payment) => {
    const f = reconcileForm;
    if (!String(f.statement_url || '').trim()) { toast.error('An uploaded bank statement document is required'); return; }
    if (!f.bank_statement_line_id) { toast.error('Enter the matched trust-bank statement line ID'); return; }
    if (!window.confirm(`Match payment ${payment.reference || `#${payment.id}`} to the bank statement?`)) return;
    call(() => api.post(`/sales/payments/${payment.id}/reconcile`, {
      reconciliation_status: 'reconciled', statement_url: f.statement_url,
      bank_statement_line_id: Number(f.bank_statement_line_id),
    }), 'Payment matched').then((res) => { if (res) setReconcileFor(null); });
  };

  // ---- Mark paid — GATED on an approved settlement and a cleared +
  // reconciled outgoing payment. Never weaken this check. ----
  const payDisbursementNow = (d, payment) => {
    if (settlement.status !== 'approved') { toast.error(`This payout cannot be marked paid while the settlement is ${label(settlement.status)}.`); return; }
    if (!payment || payment.status !== 'cleared' || payment.reconciliation_status !== 'reconciled' || !payment.bank_statement_line_id) { toast.error('The outgoing payment must be cleared and matched to the bank statement first'); return; }
    if (!window.confirm(`Confirm ${money(d.amount)} was paid to ${partyName(d.transaction_party_id) || label(d.payee_type)}?`)) return;
    call(() => api.post(`/sales/disbursements/${d.id}/pay`, { payment_id: payment.id, proof_url: d.proof_url || undefined }), 'Payout marked paid')
      .then((res) => { if (res) setPayoutLinks((prev) => { const next = { ...prev }; delete next[d.id]; return next; }); });
  };

  // ---- Advanced: submit the transfer attempt / cancel a payout ----
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
    if (!window.confirm(`Cancel payout ${d.reference || `#${d.id}`} for ${money(d.amount)}?`)) return;
    call(() => api.post(`/sales/disbursements/${d.id}/cancel`, { reason: reason.trim() }), 'Payout cancelled');
  };

  // ---- One-click "Pay out": build the create/record payloads with
  // sensible defaults (full remaining amount, the payee's one verified
  // bank account, auto reference), then chain create -> record -> clear.
  // Resumes from whichever step a row is actually at, so a retry after a
  // failure only re-runs what's left. Never silently swallows a failure. ----
  const buildDisbursementPayload = (line) => {
    const amount = remainingForLine(line);
    if (!amount) return { error: 'Nothing remaining on this obligation' };
    const fields = payeeFieldsForLine(line);
    const payload = { settlement_line_id: line.id, amount, payout_method: 'manual_bank', source_payment_id: null, ...fields };
    if (fields.payee_type === 'agency') {
      const destinationId = salesFile?.profile?.agency_bank_account_id;
      if (!destinationId) return { error: 'Set the agency operating bank account on the sales profile first' };
      payload.destination_bank_account_id = destinationId;
    } else {
      const contactId = payeeContactId(line);
      const account = partyBankAccounts.find((a) => a.status === 'verified' && Number(a.contact_id) === Number(contactId));
      if (!account) return { error: 'No verified bank account on file for this payee — add one in the full sales file' };
      payload.party_bank_account_id = account.id;
    }
    return { payload };
  };
  const buildPaymentPayload = (d) => ({
    direction: 'outgoing', payment_kind: payoutKind(d), transaction_party_id: d.transaction_party_id || null,
    payment_at: new Date().toISOString(), value_date: new Date().toISOString().slice(0, 10),
    amount: d.amount, method: 'bank_transfer',
    from_account_name: '', from_account_number: '',
    to_account_name: d.bank_account_name || '', to_account_number: d.bank_account_number || '',
    reference: d.reference || `Payout #${d.id}`, proof_url: d.proof_url || '', status: 'pending',
    idempotency_key: `payout-payment-${d.id}-${Date.now()}`,
  });
  const startPayout = async (row) => {
    const step = row.kind === 'line' ? 'create' : payoutStepFor(row.d);
    if (!['create', 'record', 'clear'].includes(step)) return;
    const payeeLabel = row.kind === 'line' ? payeeDisplayName(row.l) : (partyName(row.d.transaction_party_id) || label(row.d.payee_type));
    const amount = row.kind === 'line' ? remainingForLine(row.l) : row.d.amount;
    if (!window.confirm(`Pay out ${money(amount)} to ${payeeLabel}?`)) return;

    setBusy(true);
    setChainError(null);
    let disbursement = row.kind === 'disbursement' ? row.d : null;
    let payment = row.kind === 'disbursement' ? linkedPaymentFor(row.d) : null;
    let cur = step;
    try {
      if (cur === 'create') {
        const built = buildDisbursementPayload(row.l);
        if (built.error) { toast.error(built.error); setChainError({ rowKey: row.id, step: 'create', message: built.error }); return; }
        disbursement = unwrap(await api.post(`/sales/settlements/${sid}/disbursements`, built.payload));
        cur = 'record';
      }
      if (cur === 'record') {
        payment = unwrap(await api.post(`/sales/settlements/${sid}/payments`, buildPaymentPayload(disbursement)));
        setPayoutLinks((prev) => ({ ...prev, [disbursement.id]: payment.id }));
        cur = 'clear';
      }
      if (cur === 'clear') {
        await api.post(`/sales/payments/${payment.id}/clear`, {});
      }
      toast.success('Paid out — match it to the bank statement next');
    } catch (e) {
      const message = e.response?.data?.error || `${STEP_LABEL[cur]} failed`;
      toast.error(message);
      setChainError({ rowKey: row.id, step: cur, message });
    } finally {
      setBusy(false);
      await load();
    }
  };

  // Unified payable rows: every existing disbursement, plus every
  // still-untouched obligation while the settlement can still take new
  // ones. Ordering matches disbursements first (further along), then fresh
  // obligations.
  const payableRows = [
    ...disbursements.map((d) => ({ kind: 'disbursement', id: `d${d.id}`, d })),
    ...(editableFees ? payoutLines.map((l) => ({ kind: 'line', id: `l${l.id}`, l })) : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Contract', badges.contract], ['Settlement', settlement.status], ['Payment', paymentState], ['Payout', payoutState]].map(([k, v]) => (
          <div key={k} className="card card-pad">
            <div className="cell-sub">{k}</div>
            <Badge tone={STATUS_TONE[v] || 'grey'}>{label(v)}</Badge>
          </div>
        ))}
      </div>

      {picture.next_action && <div className="card card-pad"><strong>Next:</strong> {picture.next_action.label}</div>}
      {detailUnavailable && (
        <div className="card card-pad" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Could not load payout detail.</span>
          <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
        </div>
      )}
      {propertyId && <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open full sales file →</Button>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          ['Agreed fees', picture.money?.drafted_fees?.total_amount],
          ['Receipts', totals?.receipts],
          ['Disbursed', totals?.disbursed],
          ['Outstanding', totals?.unpaid_obligations],
          ['Funds held', totals?.funds_held],
        ].map(([k, v]) => (
          <div key={k} className="card card-pad" style={{ minWidth: 120 }}>
            <div className="cell-sub">{k}</div>
            <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{money(v)}</div>
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <strong>Agency fees</strong>
        {picture.money?.drafted_fees?.terms && <p className="cell-sub" style={{ margin: '4px 0 8px' }}>{picture.money.drafted_fees.terms}</p>}
        {!feeLines.length ? (
          <p className="cell-sub">No settlement fee lines loaded yet.</p>
        ) : (
          <table className="tbl"><tbody>
            {feeLines.map((l) => (
              <tr key={l.id}>
                <td>{label(l.line_type)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(l.amount)}</td>
                <td>{editableFees && canPrepare && <Button size="sm" variant="ghost" onClick={() => startEditFee(l)}>Edit</Button>}</td>
              </tr>
            ))}
          </tbody></table>
        )}
        {editing && canPrepare && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="New amount"><Input type="number" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></Field>
            <Field label="Reason (required)"><Input value={editing.edit_reason} onChange={(e) => setEditing({ ...editing, edit_reason: e.target.value })} /></Field>
            <Button disabled={busy} onClick={saveEditFee}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        )}
        {editableFees && canAccounts && feeLines.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Issue the vendor invoice for these agency fees?')) return;
                call(() => api.post(`/sales/settlements/${sid}/vendor-invoice`, {}), 'Vendor invoice issued');
              }}
            >
              Issue vendor invoice
            </Button>
          </div>
        )}
      </div>

      {canAccounts && (
        <div className="card card-pad">
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
      )}

      <div className="card card-pad">
        <strong>Payouts</strong>
        <table className="tbl">
          <thead><tr><th>Payout</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
          {payableRows.map((row) => {
            const step = row.kind === 'line' ? 'create' : payoutStepFor(row.d);
            const payment = row.kind === 'disbursement' ? linkedPaymentFor(row.d) : null;
            const amount = row.kind === 'line' ? remainingForLine(row.l) : row.d.amount;
            const payeeLabel = row.kind === 'line'
              ? payeeDisplayName(row.l)
              : (['vendor', 'third_party'].includes(row.d.payee_type) ? (partyName(row.d.transaction_party_id) || label(row.d.payee_type)) : label(row.d.payee_type));
            const refLabel = row.kind === 'line' ? label(row.l.line_type) : (row.d.reference || `#${row.d.id}`);
            const [progressLabel, progressTone] = PROGRESS[step] || ['—', 'grey'];
            const err = chainError?.rowKey === row.id ? chainError : null;
            const canPayOut = ['create', 'record', 'clear'].includes(step);
            const payOutDisabled = busy || (step !== 'create' && settlement.status !== 'approved');
            return (
              <React.Fragment key={row.id}>
                <tr>
                  <td>{refLabel}<span className="cell-sub">{payeeLabel}</span></td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(amount)}</td>
                  <td><Badge tone={progressTone}>{progressLabel}</Badge></td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {canAccounts && canPayOut && <Button size="sm" disabled={payOutDisabled} onClick={() => startPayout(row)}>Pay out</Button>}
                    {canAccounts && step === 'reconcile' && <Button size="sm" onClick={() => openReconcile(payment)}>Match bank</Button>}
                    {canAccounts && step === 'pay' && <Button size="sm" disabled={busy || settlement.status !== 'approved'} onClick={() => payDisbursementNow(row.d, payment)}>Mark paid</Button>}
                  </td>
                </tr>
                {err && (
                  <tr><td colSpan={4}>
                    <div className="cell-sub" style={{ color: '#b91c1c', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{STEP_LABEL[err.step] || 'Step'} failed: {err.message}</span>
                      <Button size="sm" variant="ghost" onClick={() => startPayout(row)}>Retry</Button>
                    </div>
                  </td></tr>
                )}
                {payment && reconcileFor === payment.id && (
                  <tr><td colSpan={4}>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
                      <Field label="Bank statement document"><Input value={reconcileForm.statement_url} onChange={(e) => setReconcileForm({ ...reconcileForm, statement_url: e.target.value })} placeholder="/uploads/documents/…" /></Field>
                      <Field label="Statement line ID"><Input type="number" value={reconcileForm.bank_statement_line_id} onChange={(e) => setReconcileForm({ ...reconcileForm, bank_statement_line_id: e.target.value })} /></Field>
                      <Button size="sm" disabled={busy} onClick={() => reconcilePaymentNow(payment)}>Match</Button>
                      <Button size="sm" variant="ghost" onClick={() => setReconcileFor(null)}>Cancel</Button>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
          {!payableRows.length && <tr><td colSpan={4} className="cell-sub">No payouts yet.</td></tr>}
          </tbody>
        </table>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Advanced</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {editableFees && canAccounts && (
              <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
                <div className="cell-sub" style={{ fontWeight: 700, marginBottom: 6 }}>Create payout manually</div>
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
                  <Button size="sm" disabled={busy} onClick={createPayout}>Create payout</Button>
                </div>
                {selectedPayoutLine && !selectedPayoutIsAgency && !availablePayoutAccounts.length && (
                  <p className="cell-sub" style={{ marginTop: 6 }}>No verified bank account for this payee yet — add and verify one in the full sales file.</p>
                )}
              </div>
            )}

            {Boolean(disbursements.length) && (
              <table className="tbl">
                <thead><tr><th>Disbursement</th><th>Payment</th><th>Status</th><th></th></tr></thead>
                <tbody>
                {disbursements.map((d) => {
                  const payment = linkedPaymentFor(d);
                  const step = payoutStepFor(d);
                  return (
                    <React.Fragment key={d.id}>
                      <tr>
                        <td>#{d.id}</td>
                        <td>{payment ? `#${payment.id} · ${label(payment.status)}` : '—'}</td>
                        <td><Badge tone={STATUS_TONE[d.status] || 'grey'}>{label(d.status)}</Badge></td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {canAccounts && step === 'record' && <Button size="sm" variant="ghost" disabled={busy || settlement.status !== 'approved'} onClick={() => openRecordPayment(d)}>Record payment</Button>}
                          {canAccounts && step === 'clear' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => clearPaymentNow(payment)}>Clear payment</Button>}
                          {canAccounts && settlement.status === 'approved' && ['pending', 'prepared', 'failed'].includes(d.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => submitPayoutTransfer(d)}>Submit transfer</Button>}
                          {canAccounts && editableFees && ['pending', 'prepared', 'failed'].includes(d.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => cancelPayout(d)}>Cancel</Button>}
                        </td>
                      </tr>
                      {recordFor === d.id && (
                        <tr><td colSpan={4}>
                          <div className="card card-pad" style={{ background: 'var(--surface-2)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
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
                            <Button size="sm" disabled={busy} onClick={() => recordOutgoingPayment(d)}>Record outgoing payment</Button>
                            <Button size="sm" variant="ghost" onClick={() => setRecordFor(null)}>Cancel</Button>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                </tbody>
              </table>
            )}
          </div>
        </details>
      </div>

      <div className="card card-pad" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ marginRight: 8 }}>Settlement lifecycle</strong>
        {LIFECYCLE_ACTIONS.filter((a) => a.from.includes(settlement.status) && (a.role === 'admin' ? canAdmin : canAccounts)).map((a) => (
          <Button
            key={a.key}
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`${a.label} this settlement statement?`)) return;
              call(() => api.post(`/sales/settlements/${sid}/${a.key}`, {}), a.done);
            }}
          >
            {a.label}
          </Button>
        ))}
        {!LIFECYCLE_ACTIONS.some((a) => a.from.includes(settlement.status) && (a.role === 'admin' ? canAdmin : canAccounts)) && <span className="cell-sub">No lifecycle action available{LIFECYCLE_ACTIONS.some((a) => a.from.includes(settlement.status)) ? ' for your role' : ` while ${label(settlement.status)}`}.</span>}
      </div>
    </div>
  );
}
