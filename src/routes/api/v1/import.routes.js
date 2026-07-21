const express = require('express');
const multer = require('multer');
const importController = require('../../../controllers/import.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');
const { getHttpConfig } = require('../../../config/env');
const ApiError = require('../../../utils/ApiError');

const { maxUploadSize } = getHttpConfig();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadSize, files: 1 },
  fileFilter: (req, file, callback) => {
    const accepted = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'];
    if (!accepted.includes(file.mimetype) || !file.originalname.toLowerCase().endsWith('.xlsx')) return callback(new ApiError(415, 'Only .xlsx files are accepted'));
    callback(null, true);
  },
});

const router = express.Router();

router.post(
  '/excel',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  importController.uploadFile
);

module.exports = router;
