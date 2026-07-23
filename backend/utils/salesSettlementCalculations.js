const DEDUCTION_TYPES = new Set(['commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'rounding']);
const { toMinor, fromMinor } = require('./money');
const TRANSITIONS = {
  submit: { from: ['draft', 'returned'], to: 'submitted' },
  review: { from: ['submitted'], to: 'reviewed' },
  approve: { from: ['reviewed'], to: 'approved' },
  return: { from: ['submitted', 'reviewed', 'approved'], to: 'returned' },
  lock: { from: ['approved'], to: 'locked' },
};

/* A payment and its reversal must always drop out of the books together.
   Excludes both the reversal rows and the originals they reverse, regardless
   of what status the original row carries. */
function excludeReversalPairs(payments = []) {
  const reversedIds = new Set(payments.filter((payment) => payment.reversal_of_payment_id).map((payment) => Number(payment.reversal_of_payment_id)));
  return payments.filter((payment) => !payment.reversal_of_payment_id && !reversedIds.has(Number(payment.id)));
}

function calculateSettlement(lines = [], payments = [], disbursements = []) {
  const activePayments = excludeReversalPairs(payments).filter((payment) => payment.status === 'cleared');
  const purchasePriceMinor = lines.filter((line) => line.line_type === 'purchase_price').reduce((sum, line) => sum + toMinor(line.amount), 0);
  const deductionsMinor = lines.filter((line) => DEDUCTION_TYPES.has(line.line_type)).reduce((sum, line) => sum + (line.direction === 'credit' ? -toMinor(line.amount) : toMinor(line.amount)), 0);
  const refundsMinor = lines.filter((line) => line.line_type === 'buyer_refund').reduce((sum, line) => sum + toMinor(line.amount), 0);
  const explicitVendorMinor = lines.filter((line) => line.line_type === 'vendor_proceeds').reduce((sum, line) => sum + toMinor(line.amount), 0);
  const vendorMinor = explicitVendorMinor || Math.max(purchasePriceMinor - deductionsMinor - refundsMinor, 0);
  const receiptsMinor = activePayments.filter((payment) => payment.direction === 'incoming').reduce((sum, payment) => sum + toMinor(payment.amount), 0);
  const disbursedMinor = activePayments.filter((payment) => payment.direction === 'outgoing').reduce((sum, payment) => sum + toMinor(payment.amount), 0);
  const refundedMinor = activePayments.filter((payment) => payment.direction === 'outgoing' && payment.payment_kind === 'buyer_refund').reduce((sum, payment) => sum + toMinor(payment.amount), 0);
  const pendingReceiptsMinor = excludeReversalPairs(payments).filter((payment) => payment.direction === 'incoming' && payment.status === 'pending').reduce((sum, payment) => sum + toMinor(payment.amount), 0);
  const unreconciledReceipts = excludeReversalPairs(payments).filter((payment) => payment.direction === 'incoming' && payment.status === 'cleared' && payment.reconciliation_status !== 'reconciled').length;
  const obligationsMinor = vendorMinor + deductionsMinor + refundsMinor;
  const fundsHeldMinor = receiptsMinor - disbursedMinor;
  const unpaidMinor = Math.max(obligationsMinor - disbursedMinor, 0);
  const residualMinor = fundsHeldMinor - unpaidMinor;
  const pendingDisbursements = disbursements.filter((item) => !['paid', 'cancelled'].includes(item.status)).length;
  return {
    purchase_price: fromMinor(purchasePriceMinor), receipts: fromMinor(receiptsMinor), deductions: fromMinor(deductionsMinor),
    refunds: fromMinor(refundsMinor), refunded: fromMinor(refundedMinor), pending_receipts: fromMinor(pendingReceiptsMinor),
    unreconciled_receipts: unreconciledReceipts, vendor_proceeds: fromMinor(vendorMinor), outgoing_obligations: fromMinor(obligationsMinor),
    disbursed: fromMinor(disbursedMinor), funds_held: fromMinor(fundsHeldMinor), unpaid_obligations: fromMinor(unpaidMinor),
    residual: fromMinor(residualMinor), pending_disbursements: pendingDisbursements,
  };
}

function getTransition(currentStatus, action) {
  const transition = TRANSITIONS[action];
  if (!transition || !transition.from.includes(currentStatus)) throw Object.assign(new Error(`Cannot ${action} a ${currentStatus} settlement`), { status: 409 });
  return transition.to;
}

module.exports = { calculateSettlement, getTransition, excludeReversalPairs, DEDUCTION_TYPES };
