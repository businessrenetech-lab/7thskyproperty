/**
 * /api/wt-reports — the accounting reports.
 *
 * Read-only throughout, so `canRead` is the whole guard: knowing what the
 * business collected and spent is not a privilege reserved for the people who
 * can move the money. Nothing here writes, so there is no higher tier to apply.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankReports.controller');

router.use(authMiddleware);

router.get('/', canRead, ctrl.catalogue);
// Statements are declared before /:kind so they are not read as a report name.
router.get('/statement/client/:code', canRead, ctrl.clientStatement);
router.get('/statement/provider/:name', canRead, ctrl.providerStatement);
router.get('/:kind/pdf', canRead, ctrl.pdf);
router.get('/:kind', canRead, ctrl.run);

module.exports = router;
