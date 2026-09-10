// admin-portal/src/screens/sales/settlement-desk/settlementMoney.js
//
// Pure money/status helpers for the Settlement Desk. No React, no api — every
// function takes its inputs as arguments so it can be unit-reasoned and reused
// across the five views. Ported (logic unchanged) from the retired
// DealSettlementWorkspace.jsx so behaviour matches the proven /sales flow.

// Client-side role gates — identical to SalesPropertyFile.jsx. The backend's
// roleMiddleware is the real enforcement; these only hide buttons a role can't use.
export const deskRoles = (user) => ({
  canPrepare: ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'].includes(user?.role),
  canAccounts: ['super_admin', 'branch_admin', 'accounts'].includes(user?.role),
  canAdmin: ['super_admin', 'branch_admin'].includes(user?.role),
});

export const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
export const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
export const arr = (v) => (Array.isArray(v) ? v : []);
export const label = (s) => (s == null || s === '' ? '—' : String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

export const STATUS_TONE = {
  none: 'grey', draft: 'grey', drafted: 'amber', sent: 'amber', submitted: 'amber', reviewed: 'amber',
  pending: 'amber', prepared: 'amber', processing: 'amber', partial: 'amber', in_progress: 'amber', returned: 'red', failed: 'red',
  signed: 'green', approved: 'green', received: 'green', disbursed: 'green', locked: 'green', paid: 'green', cleared: 'green', reconciled: 'green',
  unreconciled: 'amber', matched: 'amber', rejected: 'red', reversed: 'red',
  cancelled: 'grey',
};

// One-click payout progress, keyed by payoutStepFor()'s return value.
export const PROGRESS = {
  create: ['Ready', 'grey'],
  record: ['Prepared', 'amber'],
  clear: ['Payment pending', 'amber'],
  reconcile: ['Awaiting bank match', 'amber'],
  pay: ['Matched', 'blue'],
  paid: ['Paid', 'green'],
  cancelled: ['Cancelled', 'grey'],
  blocked: ['Payment rejected', 'red'],
};
export const STEP_LABEL = { create: 'Create payout', record: 'Record payment', clear: 'Clear payment' };

// payments.method ENUM on the backend — keep in sync with backend/models/SalesModels.
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'];
// Agency commission/marketing fee line types (agencyFees.service.AGENCY_LINE_TYPES) — editFeeLine allows these.
export const AGENCY_LINE_TYPES = ['commission', 'advertising'];
// Line types a payout can be raised against (mirrors SalesPropertyFile PAYOUT_LINE_TYPES).
export const PAYOUT_LINE_TYPES = ['buyer_refund', 'commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'vendor_proceeds', 'rounding'];

// Settlement lifecycle — mirrors backend/utils/salesSettlementCalculations.js TRANSITIONS.
// `role` says which client-side flag gates the button: submit/review are accounts
// actions, approve is admin-only.
export const LIFECYCLE_ACTIONS = [
  { key: 'submit', label: 'Submit', from: ['draft', 'returned'], done: 'Settlement submitted', role: 'accounts' },
  { key: 'review', label: 'Mark reviewed', from: ['submitted'], done: 'Settlement reviewed', role: 'accounts' },
  { key: 'approve', label: 'Approve', from: ['reviewed'], done: 'Settlement approved', role: 'admin' },
];

// Payment/payout badges from the read-model are always null (no such columns on
// SaleSettlement) — derive a display state from the statement totals instead.
export function derivePaymentState(totals) {
  if (!totals) return 'none';
  const receipts = Number(totals.receipts || 0);
  const price = Number(totals.purchase_price || 0);
  if (receipts <= 0) return Number(totals.pending_receipts || 0) > 0 ? 'pending' : 'none';
  if (price > 0 && receipts >= price) return 'received';
  return 'partial';
}
export function derivePayoutState(totals) {
  if (!totals) return 'none';
  const obligations = Number(totals.outgoing_obligations || 0);
  const disbursed = Number(totals.disbursed || 0);
  if (obligations > 0 && disbursed >= obligations) return 'disbursed';
  if (disbursed > 0 || Number(totals.pending_disbursements || 0) > 0) return 'in_progress';
  return 'none';
}

// The four headline badges from the desk picture (Contract / Settlement / Money due / Payouts).
export const deskBadges = (picture) => ({
  contract: picture.settlement?.contract_status || picture.contract_status || 'none',
  settlement: picture.settlement?.status || 'none',
  payment: derivePaymentState(picture.statement?.totals),
  payout: derivePayoutState(picture.statement?.totals),
});

// ---- payee resolution (mirrors backend disbursementMatchesLine rules) ----
export const payeeFieldsForLine = (line) => {
  if (line.line_type === 'vendor_proceeds') return { payee_type: 'vendor', transaction_party_id: line.payee_transaction_party_id };
  if (['commission', 'advertising', 'agency_fee', 'admin_fee'].includes(line.line_type)) return { payee_type: 'agency' };
  if (line.line_type === 'buyer_refund') return { payee_type: 'third_party', transaction_party_id: line.payee_transaction_party_id };
  return { payee_type: 'third_party', contact_id: line.payee_contact_id || undefined };
};
export const payeeContactId = (line, parties) => {
  const f = payeeFieldsForLine(line);
  return f.transaction_party_id ? parties.find((p) => Number(p.id) === Number(f.transaction_party_id))?.contact_id : f.contact_id;
};
export const partyNameFrom = (parties, id) => parties.find((p) => Number(p.id) === Number(id))?.snapshot_name;
export const payeeDisplayName = (line, parties) => {
  const f = payeeFieldsForLine(line);
  if (f.payee_type === 'agency') return 'Agency (Seventh Sky)';
  if (f.transaction_party_id) return partyNameFrom(parties, f.transaction_party_id) || label(line.line_type);
  return label(line.line_type);
};

// Remaining amount payable on a settlement line, after non-cancelled disbursements.
export const remainingForLine = (line, disbursements) => Math.max(0, Number(line.amount || 0) - arr(disbursements)
  .filter((d) => d.status !== 'cancelled' && Number(d.settlement_line_id) === Number(line.id))
  .reduce((s, d) => s + Number(d.amount || 0), 0));

// payee_type/party_type -> SalePayment.payment_kind.
export const payoutKind = (d, parties) => {
  const party = arr(parties).find((p) => Number(p.id) === Number(d.transaction_party_id));
  if (party?.party_type === 'buyer') return 'buyer_refund';
  if (d.payee_type === 'vendor') return 'vendor_payout';
  if (d.payee_type === 'agency') return 'agency_fee';
  return 'third_party';
};

// Resolve the outgoing payment a disbursement is (or should be) linked to.
// `payoutLinks` maps disbursement id -> locally-tracked payment id from a
// create-then-record chain that hasn't reached /pay yet.
export const makeLinkedPaymentFor = ({ payments, disbursements, parties, payoutLinks = {} }) => (d) => {
  const linkedId = payoutLinks[d.id] || d.payment_id;
  if (linkedId) return arr(payments).find((p) => Number(p.id) === Number(linkedId)) || null;
  const kind = payoutKind(d, parties);
  const claimed = new Set([
    ...arr(disbursements).filter((x) => x.payment_id).map((x) => Number(x.payment_id)),
    ...Object.values(payoutLinks).map(Number),
  ]);
  return arr(payments).find((p) => p.direction === 'outgoing' && p.payment_kind === kind
    && Number(p.transaction_party_id || 0) === Number(d.transaction_party_id || 0)
    && Number(p.amount) === Number(d.amount)
    && !['rejected', 'reversed'].includes(p.status)
    && !claimed.has(Number(p.id))) || null;
};

// create -> record -> clear -> reconcile -> pay -> paid. `paymentFor` is a
// resolver like makeLinkedPaymentFor(). NEVER weaken these gates.
export const payoutStepFor = (d, paymentFor) => {
  if (!d) return 'create';
  if (d.status === 'paid') return 'paid';
  if (d.status === 'cancelled') return 'cancelled';
  const payment = paymentFor(d);
  if (!payment) return 'record';
  if (payment.status === 'pending') return 'clear';
  if (payment.status === 'cleared' && payment.reconciliation_status === 'reconciled' && payment.bank_statement_line_id) return 'pay';
  if (payment.status === 'cleared') return 'reconcile';
  return 'blocked'; // rejected / reversed — needs a fresh payment
};

// Build the create-disbursement payload for a payable line.
// deps: { agencyBankAccountId, partyBankAccounts, parties, disbursements }
export const buildDisbursementPayload = (line, deps) => {
  const amount = remainingForLine(line, deps.disbursements);
  if (!amount) return { error: 'Nothing remaining on this obligation' };
  const fields = payeeFieldsForLine(line);
  const payload = { settlement_line_id: line.id, amount, payout_method: 'manual_bank', source_payment_id: null, ...fields };
  if (fields.payee_type === 'agency') {
    if (!deps.agencyBankAccountId) return { error: 'Set the agency operating bank account on the sales profile first' };
    payload.destination_bank_account_id = deps.agencyBankAccountId;
  } else {
    const contactId = payeeContactId(line, deps.parties);
    const account = arr(deps.partyBankAccounts).find((a) => a.status === 'verified' && Number(a.contact_id) === Number(contactId));
    if (!account) return { error: 'No verified bank account on file for this payee — add one in the full sales file' };
    payload.party_bank_account_id = account.id;
  }
  return { payload };
};

// Build the outgoing-payment payload for a prepared disbursement.
export const buildPaymentPayload = (d, parties) => ({
  direction: 'outgoing', payment_kind: payoutKind(d, parties), transaction_party_id: d.transaction_party_id || null,
  payment_at: new Date().toISOString(), value_date: new Date().toISOString().slice(0, 10),
  amount: d.amount, method: 'bank_transfer',
  to_account_name: d.bank_account_name || '', to_account_number: d.bank_account_number || '',
  reference: d.reference || `Payout #${d.id}`, proof_url: d.proof_url || '', status: 'pending',
  idempotency_key: `payout-payment-${d.id}-${Date.now()}`,
});
