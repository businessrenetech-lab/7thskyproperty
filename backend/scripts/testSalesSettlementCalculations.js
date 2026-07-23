const assert = require('assert');
const { calculateSettlement, getTransition, excludeReversalPairs } = require('../utils/salesSettlementCalculations');
const { disbursementMatchesLine, validateDisbursementPayment } = require('../services/salesSettlement.service');
const { toMinor, fromMinor, decimalFromMinor } = require('../utils/money');
const { beneficiaryForLine, validateSchedule } = require('../services/salesTrust.service');

assert.strictEqual(toMinor('0.01'), 1);
assert.strictEqual(toMinor('12.345'), 1235);
assert.strictEqual(toMinor('-12.345'), -1235);
assert.strictEqual(fromMinor(1235), 12.35);
assert.strictEqual(decimalFromMinor(-1235), '-12.35');
assert.throws(() => toMinor('12.3.4'), /Invalid money value/);

const lines = [
  { line_type: 'purchase_price', direction: 'credit', amount: '100000.00' },
  { line_type: 'commission', direction: 'debit', amount: '5000.00' },
  { line_type: 'vendor_proceeds', direction: 'debit', amount: '95000.00' },
];
const funded = calculateSettlement(lines, [{ direction: 'incoming', status: 'cleared', amount: '100000.00' }], []);
assert.strictEqual(funded.residual, 0);
assert.strictEqual(funded.funds_held, 100000);
assert.strictEqual(funded.unpaid_obligations, 100000);

const paid = calculateSettlement(lines, [
  { direction: 'incoming', status: 'cleared', amount: '100000.00' },
  { direction: 'outgoing', status: 'cleared', amount: '100000.00' },
], [{ status: 'paid' }]);
assert.strictEqual(paid.residual, 0);
assert.strictEqual(paid.funds_held, 0);
assert.strictEqual(paid.unpaid_obligations, 0);

const reversedReceipt = calculateSettlement(lines, [
  { id: 1, direction: 'incoming', status: 'cleared', amount: '100000.00' },
  { id: 2, reversal_of_payment_id: 1, direction: 'outgoing', status: 'cleared', amount: '100000.00' },
], []);
assert.strictEqual(reversedReceipt.receipts, 0);
assert.strictEqual(reversedReceipt.disbursed, 0);
assert.strictEqual(reversedReceipt.funds_held, 0);
assert.strictEqual(reversedReceipt.unpaid_obligations, 100000);
assert.strictEqual(reversedReceipt.residual, -100000);

const withRefund = calculateSettlement([
  { line_type: 'purchase_price', direction: 'credit', amount: '100000.00' },
  { line_type: 'commission', direction: 'debit', amount: '5000.00' },
  { line_type: 'buyer_refund', direction: 'debit', amount: '1000.00' },
], [], []);
assert.strictEqual(withRefund.deductions, 5000);
assert.strictEqual(withRefund.refunds, 1000);
assert.strictEqual(withRefund.vendor_proceeds, 94000);
assert.strictEqual(withRefund.outgoing_obligations, 100000);

// Withdrawal: two buyer installments fund one owner credit, one company
// deduction, and a partial refund. Allocations balance even though owner credit
// remains in the trust subledger until its own payout is recorded.
const withdrawal = calculateSettlement([
  { line_type: 'purchase_price', direction: 'debit', amount: '100000.00' },
  { line_type: 'vendor_proceeds', direction: 'debit', amount: '20000.00' },
  { line_type: 'admin_fee', direction: 'debit', amount: '10000.00' },
  { line_type: 'buyer_refund', direction: 'debit', amount: '70000.00' },
], [
  { id: 10, direction: 'incoming', payment_kind: 'buyer_receipt', status: 'cleared', amount: '40000.00' },
  { id: 11, direction: 'incoming', payment_kind: 'buyer_receipt', status: 'cleared', amount: '60000.00' },
  { id: 12, direction: 'outgoing', payment_kind: 'buyer_refund', status: 'cleared', amount: '70000.00' },
], []);
assert.strictEqual(withdrawal.receipts, 100000);
assert.strictEqual(withdrawal.refunds, 70000);
assert.strictEqual(withdrawal.vendor_proceeds, 20000);
assert.strictEqual(withdrawal.deductions, 10000);
assert.strictEqual(withdrawal.residual, 0);
assert.strictEqual(withdrawal.unpaid_obligations, 30000);

// Refunded = buyer refunds actually paid; vendor payouts must NOT count.
const refundVsPayout = calculateSettlement(lines, [
  { id: 1, direction: 'incoming', payment_kind: 'buyer_receipt', status: 'cleared', amount: '100000.00' },
  { id: 2, direction: 'outgoing', payment_kind: 'vendor_payout', status: 'cleared', amount: '60000.00' },
  { id: 3, direction: 'outgoing', payment_kind: 'buyer_refund', status: 'cleared', amount: '5000.00' },
], []);
assert.strictEqual(refundVsPayout.refunded, 5000);
assert.strictEqual(refundVsPayout.disbursed, 65000);
assert.strictEqual(refundVsPayout.receipts, 100000);

// Pending money never counts as received; it is reported separately.
const pending = calculateSettlement(lines, [
  { id: 1, direction: 'incoming', status: 'pending', amount: '40000.00' },
  { id: 2, direction: 'incoming', status: 'cleared', amount: '60000.00' },
  { id: 3, direction: 'incoming', status: 'rejected', amount: '9999.00' },
], []);
assert.strictEqual(pending.receipts, 60000);
assert.strictEqual(pending.pending_receipts, 40000);

const payoutStates = calculateSettlement(lines, [], [
  { status: 'prepared', amount: '10.00' },
  { status: 'submitted', amount: '10.00' },
  { status: 'processing', amount: '10.00' },
  { status: 'failed', amount: '10.00' },
  { status: 'paid', amount: '10.00' },
  { status: 'cancelled', amount: '10.00' },
]);
assert.strictEqual(payoutStates.pending_disbursements, 4);

// A reversed original is excluded even after its status flips to 'reversed'.
const reversedStatus = calculateSettlement(lines, [
  { id: 1, direction: 'incoming', status: 'reversed', amount: '100000.00' },
  { id: 2, reversal_of_payment_id: 1, direction: 'outgoing', status: 'cleared', amount: '100000.00' },
], []);
assert.strictEqual(reversedStatus.receipts, 0);
assert.strictEqual(reversedStatus.disbursed, 0);
assert.strictEqual(reversedStatus.funds_held, 0);

// Reversal-pair exclusion keeps the pair out no matter the original's status.
const pairFiltered = excludeReversalPairs([
  { id: 1, direction: 'incoming', status: 'cleared', amount: '10.00' },
  { id: 2, direction: 'incoming', status: 'reversed', amount: '20.00' },
  { id: 3, reversal_of_payment_id: 2, direction: 'outgoing', status: 'cleared', amount: '20.00' },
]);
assert.deepStrictEqual(pairFiltered.map((payment) => payment.id), [1]);

// Unreconciled cleared receipts are counted for the reconcile control.
const reconciliation = calculateSettlement(lines, [
  { id: 1, direction: 'incoming', status: 'cleared', reconciliation_status: 'reconciled', amount: '50000.00' },
  { id: 2, direction: 'incoming', status: 'cleared', reconciliation_status: 'unreconciled', amount: '30000.00' },
  { id: 3, direction: 'incoming', status: 'cleared', amount: '20000.00' },
], []);
assert.strictEqual(reconciliation.unreconciled_receipts, 2);
assert.strictEqual(reconciliation.receipts, 100000);

assert.strictEqual(getTransition('draft', 'submit'), 'submitted');
assert.strictEqual(getTransition('reviewed', 'approve'), 'approved');
assert.throws(() => getTransition('draft', 'approve'), /Cannot approve/);

const vendorDisbursement = { id: 7, payee_type: 'vendor', transaction_party_id: 44, amount: '1250.00' };
const vendorParty = { id: 44, party_type: 'vendor' };
const exactVendorPayment = { id: 8, direction: 'outgoing', status: 'cleared', payment_kind: 'vendor_payout', transaction_party_id: 44, amount: '1250.00' };
assert.doesNotThrow(() => validateDisbursementPayment(vendorDisbursement, exactVendorPayment, vendorParty));
assert.throws(() => validateDisbursementPayment(vendorDisbursement, { ...exactVendorPayment, direction: 'incoming' }, vendorParty), /cleared outgoing/);
assert.throws(() => validateDisbursementPayment(vendorDisbursement, { ...exactVendorPayment, payment_kind: 'third_party' }, vendorParty), /vendor_payout/);
assert.throws(() => validateDisbursementPayment(vendorDisbursement, { ...exactVendorPayment, transaction_party_id: 45 }, vendorParty), /party must match/);
assert.throws(() => validateDisbursementPayment(vendorDisbursement, { ...exactVendorPayment, amount: '1250.01' }, vendorParty), /exactly match/);
assert.throws(() => validateDisbursementPayment(vendorDisbursement, exactVendorPayment, vendorParty, true), /already allocated/);
const buyerRefund = { payee_type: 'third_party', transaction_party_id: 55, amount: '500.00' };
assert.doesNotThrow(() => validateDisbursementPayment(buyerRefund, { direction: 'outgoing', status: 'cleared', payment_kind: 'buyer_refund', transaction_party_id: 55, amount: '500.00' }, { id: 55, party_type: 'buyer' }));
assert.doesNotThrow(() => validateDisbursementPayment(
  { ...vendorDisbursement, bank_account_number: '001-234 567' },
  { ...exactVendorPayment, to_account_number: '001234567' },
  vendorParty,
));
assert.throws(() => validateDisbursementPayment(
  { ...vendorDisbursement, bank_account_number: '001234567' },
  { ...exactVendorPayment, to_account_number: '999999999' },
  vendorParty,
), /destination account/);
assert.strictEqual(disbursementMatchesLine(vendorDisbursement, { line_type: 'vendor_proceeds', payee_transaction_party_id: 44 }, vendorParty), true);
assert.strictEqual(disbursementMatchesLine(vendorDisbursement, { line_type: 'vendor_proceeds', payee_transaction_party_id: 45 }, vendorParty), false);
assert.strictEqual(disbursementMatchesLine(buyerRefund, { line_type: 'buyer_refund', payee_transaction_party_id: 55 }, { id: 55, party_type: 'buyer' }), true);
const agencyDisbursement = { payee_type: 'agency', amount: '5000.00', bank_account_number: '009-876' };
const agencyPayment = { direction: 'outgoing', status: 'cleared', payment_kind: 'agency_fee', amount: '5000.00', to_account_number: '009876' };
assert.doesNotThrow(() => validateDisbursementPayment(agencyDisbursement, agencyPayment, null));
assert.throws(() => validateDisbursementPayment(agencyDisbursement, { ...agencyPayment, payment_kind: 'third_party' }, null), /agency_fee/);
assert.strictEqual(disbursementMatchesLine(agencyDisbursement, { line_type: 'commission' }, null), true);
assert.strictEqual(disbursementMatchesLine(agencyDisbursement, { line_type: 'admin_fee' }, null), true);
const trustParties = [
  { id: 44, party_type: 'vendor', status: 'active', contact_id: 7 },
  { id: 55, party_type: 'buyer', status: 'active', contact_id: 8 },
];
assert.deepStrictEqual(
  beneficiaryForLine({ id: 1, line_type: 'admin_fee' }, trustParties),
  { key: 'agency', type: 'agency', transaction_party_id: null, contact_id: null },
);
assert.deepStrictEqual(
  beneficiaryForLine({ id: 2, line_type: 'buyer_refund', payee_transaction_party_id: 55 }, trustParties),
  { key: 'buyer:55', type: 'buyer', transaction_party_id: 55, contact_id: 8 },
);
assert.deepStrictEqual(validateSchedule([
  { id: 1, line_type: 'purchase_price', direction: 'credit', amount: '100.00' },
  { id: 2, line_type: 'vendor_proceeds', direction: 'debit', amount: '99.99', payee_transaction_party_id: 44 },
  { id: 3, line_type: 'admin_fee', direction: 'debit', amount: '0.01' },
], trustParties).errors, []);
assert.ok(validateSchedule([
  { id: 1, line_type: 'purchase_price', direction: 'credit', amount: '100.00' },
  { id: 2, line_type: 'vendor_proceeds', direction: 'debit', amount: '99.98', payee_transaction_party_id: 44 },
  { id: 3, line_type: 'admin_fee', direction: 'debit', amount: '0.01' },
], trustParties).errors.includes('purchase_price_must_equal_all_outgoing_obligations'));
console.log('sales settlement calculations: PASS');
