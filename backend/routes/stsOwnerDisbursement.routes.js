/**
 * /api/sts-disbursements — money paid to property owners.
 *
 * Reading is open to anyone who works the operation; knowing what the business
 * has paid out is not a privilege. Paying sits with finance, and reversing a
 * payment is a correction to the books, so it stays with administrators — the
 * same split the provider side uses.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/stsOwnerDisbursement.controller');

const READ = ['super_admin', 'branch_admin', 'property_manager', 'accounts', 'sales_executive'];
const PAY = ['super_admin', 'branch_admin', 'accounts'];
const ADMIN = ['super_admin', 'branch_admin'];

router.use(authMiddleware);

router.get('/reference', roleMiddleware(READ), ctrl.reference);
// Who is owed money, with what is genuinely left on each statement.
router.get('/due', roleMiddleware(READ), ctrl.due);
router.get('/journal', roleMiddleware(READ), ctrl.journal);
// The run as one document. Declared before /:code so it is not swallowed.
router.get('/run/:batch/voucher', roleMiddleware(READ), ctrl.runVoucher);
router.post('/run', roleMiddleware(PAY), ctrl.run);

router.get('/', roleMiddleware(READ), ctrl.list);
router.get('/:code/voucher', roleMiddleware(READ), ctrl.voucher);
router.post('/:statementId/pay', roleMiddleware(PAY), ctrl.pay);
router.post('/:code/reverse', roleMiddleware(ADMIN), ctrl.reverse);

module.exports = router;
