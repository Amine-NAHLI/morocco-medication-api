const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const reimbursementController = require('../../../controllers/reimbursement.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
  .get(reimbursementController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    validate,
    reimbursementController.create
  );

router.route('/:id')
  .get(reimbursementController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    validate,
    reimbursementController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    reimbursementController.delete
  );

module.exports = router;
