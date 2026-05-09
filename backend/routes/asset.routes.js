const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(protect);
router.use(authorize(['super_admin', 'branch_admin']));
router.use(branchMiddleware);

router.get('/stats', assetController.getAssetStats);
router.get('/', assetController.getAssets);
router.post('/', assetController.createAsset);
router.put('/:id', assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);

module.exports = router;
