const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const organizationController = require('../../../controllers/organization.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(organizationController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    organizationController.create
  );

router.route('/:id')
  .get(organizationController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    organizationController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    organizationController.delete
  );

module.exports = router;
