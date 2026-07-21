const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const activeIngredientController = require('../../../controllers/activeIngredient.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(activeIngredientController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    activeIngredientController.create
  );

router.route('/:id')
  .get(activeIngredientController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    activeIngredientController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    activeIngredientController.delete
  );

module.exports = router;
