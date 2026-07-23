const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/agreementTemplate.controller');
const upload = require('../utils/uploadAny');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.post('/parse', upload.single('file'), ctrl.parse);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/prefill', ctrl.prefill);
router.post('/:id/preview', ctrl.preview);
router.post('/:id/prepare', ctrl.prepare);

module.exports = router;
