const express = require('express');
const syncController = require('../../../controllers/sync.controller');
const catchAsync = require('../../../utils/catchAsync');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.post('/cnops', authenticate, authorize('ADMIN'), catchAsync(syncController.syncCnops));
router.post('/cnss', authenticate, authorize('ADMIN'), catchAsync(syncController.syncCnss));
router.post('/anam', authenticate, authorize('ADMIN'), catchAsync(syncController.syncAnam));
router.post('/all', authenticate, authorize('ADMIN'), catchAsync(syncController.syncAll));

router.get('/status', authenticate, authorize('ADMIN'), catchAsync(syncController.getStatus));
router.get('/history', authenticate, authorize('ADMIN'), catchAsync(syncController.getHistory));

module.exports = router;
