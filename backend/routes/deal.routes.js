const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deal.controller');
const settle = require('../controllers/dealSettlement.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
// Read-only readiness feed for the bulk settlement screen — lists each deal's
// linked /sales settlement and whether it is ready to lock (approved + no
// compliance blockers). Posts no money; the screen locks each row through the
// authoritative /api/sales/settlements/:id/lock.
router.get('/settlement/sales-bulk-data', settle.salesBulkData);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.get('/:id/sales-picture', settle.salesPicture);

// A deal's money is written by /api/sales/* only, read here via sales-picture.
// The deal's own money endpoints were retired on 2026-09-10: the money-writing
// ones (prepare / approve / receive / disbursements / disbursements/:did/pay /
// settle) first, then on 2026-09-11 the last of the weak read/flip paths —
// GET /:id/settlement (LIKE `DEAL:<code>` money picture) and the
// /settlement/bulk{,-data} status-flip that settled a deal without any /sales
// posting. The bulk screen now settles through the /sales lock, so nothing is
// left that touches a deal's money outside the /sales engine.

module.exports = router;
