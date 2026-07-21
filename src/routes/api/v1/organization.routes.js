const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const organizationController = require('../../../controllers/organization.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    organizationController.create
  )
  .get(organizationController.findAll);

router.route('/:id')
  .get(organizationController.findById)
  .put(
    validate,
    organizationController.update
  )
  .delete(organizationController.delete);

module.exports = router;
