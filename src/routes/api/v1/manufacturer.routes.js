const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const manufacturerController = require('../../../controllers/manufacturer.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(manufacturerController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    manufacturerController.create
  );

router.route('/:id')
  .get(manufacturerController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    manufacturerController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    manufacturerController.delete
  );

module.exports = router;
