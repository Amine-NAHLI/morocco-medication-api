const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const activeIngredientController = require('../../../controllers/activeIngredient.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    activeIngredientController.create
  )
  .get(activeIngredientController.findAll);

router.route('/:id')
  .get(activeIngredientController.findById)
  .put(
    validate,
    activeIngredientController.update
  )
  .delete(activeIngredientController.delete);

module.exports = router;
