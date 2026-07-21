const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const importHistoryController = require('../../../controllers/importHistory.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    importHistoryController.create
  )
  .get(importHistoryController.findAll);

router.route('/:id')
  .get(importHistoryController.findById)
  .put(
    validate,
    importHistoryController.update
  )
  .delete(importHistoryController.delete);

module.exports = router;
