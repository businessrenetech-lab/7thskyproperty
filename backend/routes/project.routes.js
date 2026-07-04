const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/project.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

const upload = require('../utils/uploadDocument');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({
    file_url: `/uploads/documents/${req.file.filename}`,
    file_name: req.file.originalname
  });
});
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/stages/:stageId', ctrl.updateStage);

module.exports = router;
