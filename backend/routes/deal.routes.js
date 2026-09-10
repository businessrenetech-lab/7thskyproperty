const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deal.controller');
const settle = require('../controllers/dealSettlement.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/settlement/bulk-data', settle.bulkData);
router.post('/settlement/bulk', settle.bulkSettle);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.get('/:id/settlement', settle.getSettlement);
router.get('/:id/sales-picture', settle.salesPicture);

// The deal's own money-writing endpoints (prepare / approve / receive /
// disbursements / disbursements/:did/pay / settle) were retired on 2026-09-10.
// They wrote money by weaker mechanics than the /sales engine — receipts matched
// on a `DEAL:<code>` text reference, payment recorded over internal HTTP, a
// "paid" flag with no journal posting, and no lock around the held-funds check.
// A deal's money now goes through /api/sales/* only, read here via sales-picture.
// The two /settlement/bulk* routes above are read + status-flip (they post no
// money) and stay until the bulk screen is repointed at /sales readiness.

module.exports = router;
