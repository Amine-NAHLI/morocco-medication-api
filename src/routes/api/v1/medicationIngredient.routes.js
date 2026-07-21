const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const medicationIngredientController = require('../../../controllers/medicationIngredient.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(medicationIngredientController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    medicationIngredientController.create
  );

router.route('/:id')
  .get(medicationIngredientController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    medicationIngredientController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    medicationIngredientController.delete
  );

module.exports = router;
