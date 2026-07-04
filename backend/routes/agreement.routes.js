const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/agreement.controller');
const upload = require('../utils/uploadAgreement');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// Agreement library lives under DocuSign/document management
const MANAGE_ROLES = ['super_admin', 'branch_admin', 'property_manager'];

router.use(authMiddleware);
router.use(roleMiddleware(MANAGE_ROLES));

router.get('/', ctrl.list);
router.post('/', upload.single('file'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.archive);

router.get('/:id/versions', ctrl.listVersions);
router.post('/:id/versions', upload.single('file'), ctrl.uploadVersion);
router.patch('/:id/versions/:versionId/set-current', ctrl.setCurrentVersion);

module.exports = router;
