/**
 * waterTankClientDocs.routes.js — client Document Manager (Property Doc
 * Verification & Transfer service lines). Staff-facing; the module itself refuses
 * lines that don't have `doc_manager` in their manifest. Fixed paths precede the
 * /:id family so they aren't swallowed.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canBind } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankClientDocs.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
router.get('/summary', canRead, ctrl.summary);
router.get('/requests', canRead, ctrl.listRequests);
router.post('/requests', canOperate, ctrl.createRequest);
router.post('/requests/:id/cancel', canOperate, ctrl.cancelRequest);
router.get('/', canRead, ctrl.list);
router.post('/', canOperate, ctrl.create);
router.patch('/:id', canOperate, ctrl.update);
router.delete('/:id', canBind, ctrl.remove);

module.exports = router;
