const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const manufacturerController = require('../../../controllers/manufacturer.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    manufacturerController.create
  )
  .get(manufacturerController.findAll);

router.route('/:id')
  .get(manufacturerController.findById)
  .put(
    validate,
    manufacturerController.update
  )
  .delete(manufacturerController.delete);

module.exports = router;
