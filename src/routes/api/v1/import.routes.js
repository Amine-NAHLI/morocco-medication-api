const express = require('express');
const multer = require('multer');
const importController = require('../../../controllers/import.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

// Store file in memory buffer
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post(
  '/excel',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  importController.uploadFile
);

module.exports = router;
