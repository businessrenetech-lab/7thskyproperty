const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sales.controller');
const assessmentCtrl = require('../controllers/salesAssessment.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const READ = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
const PREPARE = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
const ACCOUNTS = ['super_admin', 'branch_admin', 'accounts'];
const ADMIN = ['super_admin', 'branch_admin'];
const REVIEW = ['super_admin', 'branch_admin', 'property_manager'];

router.use(authMiddleware);
router.get('/dashboard', roleMiddleware(READ), ctrl.dashboard);
router.get('/accounting-options', roleMiddleware(ACCOUNTS), ctrl.accountingOptions);
router.post('/bank-accounts', roleMiddleware(ACCOUNTS), ctrl.createPhysicalBankAccount);
router.get('/properties/:propertyId', roleMiddleware(READ), ctrl.getPropertyFile);
router.get('/properties/:propertyId/assessment-workspace', roleMiddleware(READ), assessmentCtrl.getWorkspace);
router.post('/properties/:propertyId/assessments', roleMiddleware(PREPARE), assessmentCtrl.createAssessment);
router.put('/assessments/:id', roleMiddleware(PREPARE), assessmentCtrl.updateAssessment);
router.post('/assessments/:id/items', roleMiddleware(PREPARE), assessmentCtrl.addAssessmentItem);
router.put('/assessment-items/:id', roleMiddleware(PREPARE), assessmentCtrl.updateAssessmentItem);
router.delete('/assessment-items/:id', roleMiddleware(PREPARE), assessmentCtrl.deleteAssessmentItem);
router.get('/assessment-items/:id/photos/:index', roleMiddleware(READ), assessmentCtrl.downloadAssessmentPhoto);
router.post('/assessments/:id/submit', roleMiddleware(PREPARE), assessmentCtrl.submitAssessment);
router.post('/assessments/:id/approve', roleMiddleware(REVIEW), assessmentCtrl.approveAssessment);
router.post('/assessments/:id/reopen', roleMiddleware(REVIEW), assessmentCtrl.reopenAssessment);
router.post('/assessments/:id/appraisal', roleMiddleware(PREPARE), assessmentCtrl.upsertAppraisal);
router.put('/appraisals/:id', roleMiddleware(PREPARE), assessmentCtrl.updateAppraisal);
router.post('/appraisals/:id/comparables', roleMiddleware(PREPARE), assessmentCtrl.addComparable);
router.put('/appraisal-comparables/:id', roleMiddleware(PREPARE), assessmentCtrl.updateComparable);
router.delete('/appraisal-comparables/:id', roleMiddleware(PREPARE), assessmentCtrl.deleteComparable);
router.post('/appraisals/:id/submit', roleMiddleware(PREPARE), assessmentCtrl.submitAppraisal);
router.post('/appraisals/:id/approve', roleMiddleware(REVIEW), assessmentCtrl.approveAppraisal);
router.post('/appraisals/:id/generate-report', roleMiddleware(PREPARE), assessmentCtrl.generateAppraisalReport);
router.post('/assessments/:id/proposals', roleMiddleware(PREPARE), assessmentCtrl.createProposal);
router.put('/proposals/:id', roleMiddleware(PREPARE), assessmentCtrl.updateProposal);
router.post('/proposals/:id/generate', roleMiddleware(PREPARE), assessmentCtrl.generateProposal);
router.post('/proposals/:id/send', roleMiddleware(PREPARE), assessmentCtrl.sendProposal);
router.post('/proposals/:id/accept', roleMiddleware(PREPARE), assessmentCtrl.acceptProposal);
router.post('/proposals/:id/reject', roleMiddleware(PREPARE), assessmentCtrl.rejectProposal);
router.get('/reports/:id/download', roleMiddleware(READ), assessmentCtrl.downloadReport);
router.put('/properties/:propertyId/profile', roleMiddleware(PREPARE), ctrl.upsertProfile);
router.put('/properties/:propertyId/accounting', roleMiddleware(ACCOUNTS), ctrl.updateProfileAccounting);
router.post('/properties/:propertyId/parties', roleMiddleware(PREPARE), ctrl.addPropertyParty);
router.patch('/parties/:id', roleMiddleware(PREPARE), ctrl.patchPropertyParty);
router.post('/properties/:propertyId/offers', roleMiddleware(PREPARE), ctrl.createOffer);
router.patch('/offers/:id', roleMiddleware(PREPARE), ctrl.patchOffer);
router.post('/offers/:id/status', roleMiddleware(PREPARE), ctrl.updateOfferStatus);
router.post('/offers/:id/accept', roleMiddleware(PREPARE), ctrl.acceptOffer);
router.post('/transactions/:id/parties', roleMiddleware(PREPARE), ctrl.addTransactionParty);
router.patch('/transaction-parties/:id', roleMiddleware(PREPARE), ctrl.patchTransactionParty);
router.get('/transactions/:id/bank-accounts', roleMiddleware(ACCOUNTS), ctrl.listTransactionBankAccounts);
router.post('/transaction-parties/:id/bank-accounts', roleMiddleware(ACCOUNTS), ctrl.createPartyBankAccount);
router.post('/contacts/:id/bank-accounts', roleMiddleware(ACCOUNTS), ctrl.createContactBankAccount);
router.post('/party-bank-accounts/:id/verify', roleMiddleware(ACCOUNTS), ctrl.verifyPartyBankAccount);
router.post('/transactions/:id/settlement', roleMiddleware(PREPARE), ctrl.createSettlement);
router.post('/transactions/:id/withdrawal', roleMiddleware(PREPARE), ctrl.prepareWithdrawal);
// Fast unwind when no money cleared: offer withdrawn, property back on market.
router.post('/transactions/:id/cancel', roleMiddleware(PREPARE), ctrl.cancelTransaction);
router.put('/settlements/:id/lines', roleMiddleware(PREPARE), ctrl.replaceSettlementLines);
// One-click rebalance: vendor proceeds = price − deductions − refunds due.
router.post('/settlements/:id/rebalance', roleMiddleware(PREPARE), ctrl.rebalanceSettlement);
router.post('/settlements/:id/funding-requests', roleMiddleware(PREPARE), ctrl.createFundingRequest);
router.post('/funding-requests/:id/initiate', roleMiddleware(PREPARE), ctrl.initiateFundingRequest);
// Post (or re-attempt) the ledger journal for a cleared payment.
router.post('/payments/:id/post', roleMiddleware(ACCOUNTS), ctrl.postPayment);
router.post('/settlements/:id/payments', roleMiddleware(ACCOUNTS), ctrl.createPayment);
router.post('/payments/:id/clear', roleMiddleware(ACCOUNTS), ctrl.clearPayment);
router.post('/payments/:id/reject', roleMiddleware(ACCOUNTS), ctrl.rejectPayment);
router.post('/payments/:id/reverse', roleMiddleware(ACCOUNTS), ctrl.reversePayment);
// Bank reconciliation: match a cleared payment to an uploaded bank statement.
router.post('/payments/:id/reconcile', roleMiddleware(ACCOUNTS), ctrl.reconcilePayment);
router.get('/settlements/:id/bank-lines', roleMiddleware(ACCOUNTS), ctrl.listSettlementBankLines);
router.post('/settlements/:id/bank-lines', roleMiddleware(ACCOUNTS), ctrl.createSettlementBankLine);
// The trust account statement — the full audit view with running balance.
router.get('/settlements/:id/statement', roleMiddleware(READ), ctrl.getStatement);
// Agency fees: quote from the vendor's agreement, edit a fee (with a written term),
// and issue the vendor's invoice carrying those terms.
router.get('/settlements/:id/agency-fees', roleMiddleware(READ), ctrl.agencyFeeQuote);
router.patch('/settlement-lines/:id/fee', roleMiddleware(PREPARE), ctrl.editFeeLine);
router.get('/settlements/:id/vendor-invoice', roleMiddleware(READ), ctrl.getVendorInvoice);
router.post('/settlements/:id/vendor-invoice', roleMiddleware(ACCOUNTS), ctrl.issueVendorInvoice);
router.post('/settlements/:id/disbursements', roleMiddleware(ACCOUNTS), ctrl.createDisbursement);
router.post('/disbursements/:id/submit', roleMiddleware(ACCOUNTS), ctrl.submitDisbursement);
router.post('/disbursements/:id/fail', roleMiddleware(ACCOUNTS), ctrl.failDisbursement);
router.post('/disbursements/:id/sync', roleMiddleware(ACCOUNTS), ctrl.syncDisbursement);
router.post('/disbursements/:id/pay', roleMiddleware(ACCOUNTS), ctrl.payDisbursement);
router.post('/disbursements/:id/cancel', roleMiddleware(ACCOUNTS), ctrl.cancelDisbursement);
router.post('/settlements/:id/submit', roleMiddleware(PREPARE), ctrl.settlementAction('submit'));
// Review/return are the accounts check — but super_admin and branch_admin must be
// able to act too, or a branch without a dedicated accounts user can never move a
// settlement past 'submitted'. Independence is enforced in the controller by user,
// not by role, so widening this does not weaken the control.
router.post('/settlements/:id/review', roleMiddleware(ACCOUNTS), ctrl.settlementAction('review'));
router.post('/settlements/:id/approve', roleMiddleware(ADMIN), ctrl.settlementAction('approve'));
router.post('/settlements/:id/return', roleMiddleware(ACCOUNTS), ctrl.settlementAction('return'));
router.post('/settlements/:id/lock', roleMiddleware(ADMIN), ctrl.settlementAction('lock'));
router.use(ctrl.errorHandler);

module.exports = router;
