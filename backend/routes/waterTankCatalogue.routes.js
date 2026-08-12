/**
 * waterTankCatalogue.routes.js — the Water Tank price schedule.
 * Mounted at /api/wt-catalogue.
 *
 * Reading the schedule is open to anyone who works the operation; changing it is
 * not. A price here becomes the figure on a signed agreement, so edits sit with
 * the people who can bind the business, and deletion with administrators.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankCatalogue.controller');

router.use(authMiddleware);

// Fixed paths before the /:id family so they are not swallowed.
router.get('/', canRead, ctrl.list);
router.get('/:code/price-on', canRead, ctrl.priceOn);
router.post('/', canBind, ctrl.create);

router.get('/:id', canRead, ctrl.detail);
router.patch('/:id', canBind, ctrl.update);
router.post('/:id/archive', canBind, ctrl.archive);
router.post('/:id/restore', canBind, ctrl.restore);
router.post('/:id/clone', canBind, ctrl.clone);
// Refused outright for anything already priced into a record — see the service.
router.delete('/:id', canAdminister, ctrl.remove);

module.exports = router;
