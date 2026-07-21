const express = require('express');
const multer = require('multer');
const importController = require('../../controllers/import.controller');

// Store file in memory buffer
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post('/excel', upload.single('file'), importController.uploadFile);

module.exports = router;
