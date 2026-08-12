/**
 * /api/wt-projects — the Water Tank project file (SSPC-WTCM-SOP-01).
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankProject.controller');

router.use(authMiddleware);

// Reference + lookups for the entry wizard. These sit above /:code so a project
// is never looked up by the literal string "reference".
router.get('/reference', ctrl.reference);
router.get('/overview', ctrl.overview);
router.get('/client-lookup', ctrl.clientLookup);
router.get('/property-lookup', ctrl.propertyLookup);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

// Disbursements — declared before /:code so the nested path wins the match.
router.get('/:code/disbursements', ctrl.listDisbursements);
router.post('/:code/disbursements', ctrl.addDisbursement);
router.patch('/:code/disbursements/:id', ctrl.updateDisbursement);
router.delete('/:code/disbursements/:id', ctrl.removeDisbursement);

// Hydration for the documents raised from a project.
router.get('/:code/agreement-draft', ctrl.agreementDraft);
router.get('/:code/quotation-draft', ctrl.quotationDraft);
router.post('/:code/link-agreement', ctrl.linkAgreement);

router.post('/:code/stage', ctrl.setStage);
router.post('/:code/closure', ctrl.closure);

router.get('/:code', ctrl.detail);
router.patch('/:code', ctrl.update);
router.delete('/:code', ctrl.remove);

module.exports = router;
