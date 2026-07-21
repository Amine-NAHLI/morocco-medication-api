const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const importHistoryController = require('../../../controllers/importHistory.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(importHistoryController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    importHistoryController.create
  );

router.route('/:id')
  .get(importHistoryController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    importHistoryController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    importHistoryController.delete
  );

module.exports = router;
