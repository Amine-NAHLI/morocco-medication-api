const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const categoryController = require('../../../controllers/category.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(categoryController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    categoryController.create
  );

router.route('/:id')
  .get(categoryController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    categoryController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    categoryController.delete
  );

module.exports = router;
