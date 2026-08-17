/**
 * /api/wt-disbursements — money leaving Seventh Sky.
 *
 * Reading is open to anyone who works the operation, because knowing what the
 * business has spent is not a privilege. Paying is `canTransact`, the same tier
 * that takes money in. Reversing a payment is a correction to the books and
 * stays with administrators, as it does for receipts.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canTransact, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankDisbursement.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
// Everything waiting to be paid, provider fees and direct costs in one list —
// a payment run does not care which kind a line is.
router.get('/due', canRead, ctrl.due);
// The run as a single document. Declared before /:code so it is not swallowed.
router.get('/run/:batch/voucher', canRead, ctrl.runVoucher);
router.post('/run', canTransact, ctrl.run);

router.get('/', canRead, ctrl.list);
router.post('/', canTransact, ctrl.create);

router.get('/:code/voucher', canRead, ctrl.voucher);
router.post('/:code/pay', canTransact, ctrl.pay);
router.post('/:code/reverse', canAdminister, ctrl.reverse);

module.exports = router;
