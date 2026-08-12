/**
 * /api/wt-projects — the Water Tank project file (SSPC-WTCM-SOP-01).
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankProject.controller');

router.use(authMiddleware);

// Reference + lookups for the entry wizard. These sit above /:code so a project
// is never looked up by the literal string "reference".
router.get('/reference', canRead, ctrl.reference);
router.get('/overview', canRead, ctrl.overview);
router.get('/client-lookup', canRead, ctrl.clientLookup);
router.get('/property-lookup', canRead, ctrl.propertyLookup);
router.get('/', canRead, ctrl.list);
router.post('/', canOperate, ctrl.create);
// Disbursements — declared before /:code so the nested path wins the match.
router.get('/:code/disbursements', canRead, ctrl.listDisbursements);
router.post('/:code/disbursements', canTransact, ctrl.addDisbursement);
router.patch('/:code/disbursements/:id', canTransact, ctrl.updateDisbursement);
router.delete('/:code/disbursements/:id', canAdminister, ctrl.removeDisbursement);
// Hydration for the documents raised from a project.
router.get('/:code/agreement-draft', canRead, ctrl.agreementDraft);
router.get('/:code/quotation-draft', canRead, ctrl.quotationDraft);
router.post('/:code/link-agreement', canBind, ctrl.linkAgreement);
router.post('/:code/stage', canOperate, ctrl.setStage);
router.post('/:code/closure', canOperate, ctrl.closure);
router.get('/:code', canRead, ctrl.detail);
router.patch('/:code', canOperate, ctrl.update);
router.delete('/:code', canAdminister, ctrl.remove);

module.exports = router;
