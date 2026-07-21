const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const categoryController = require('../../../controllers/category.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    categoryController.create
  )
  .get(categoryController.findAll);

router.route('/:id')
  .get(categoryController.findById)
  .put(
    validate,
    categoryController.update
  )
  .delete(categoryController.delete);

module.exports = router;
