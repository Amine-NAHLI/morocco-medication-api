const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const medicationController = require('../../../controllers/medication.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(medicationController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    medicationController.create
  );

router.route('/:id')
  .get(medicationController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    medicationController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    medicationController.delete
  );

module.exports = router;
