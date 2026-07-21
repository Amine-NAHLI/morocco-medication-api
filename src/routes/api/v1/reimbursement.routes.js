const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const reimbursementController = require('../../../controllers/reimbursement.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    reimbursementController.create
  )
  .get(reimbursementController.findAll);

router.route('/:id')
  .get(reimbursementController.findById)
  .put(
    validate,
    reimbursementController.update
  )
  .delete(reimbursementController.delete);

module.exports = router;
