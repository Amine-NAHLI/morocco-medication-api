const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const medicationController = require('../../../controllers/medication.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    medicationController.create
  )
  .get(medicationController.findAll);

router.route('/:id')
  .get(medicationController.findById)
  .put(
    validate,
    medicationController.update
  )
  .delete(medicationController.delete);

module.exports = router;
