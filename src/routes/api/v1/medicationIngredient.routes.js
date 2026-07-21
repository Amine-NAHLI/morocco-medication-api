const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const medicationIngredientController = require('../../../controllers/medicationIngredient.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    medicationIngredientController.create
  )
  .get(medicationIngredientController.findAll);

router.route('/:id')
  .get(medicationIngredientController.findById)
  .put(
    validate,
    medicationIngredientController.update
  )
  .delete(medicationIngredientController.delete);

module.exports = router;
