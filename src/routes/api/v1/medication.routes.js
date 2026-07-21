const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const medicationController = require('../../../controllers/medication.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

const medicationRules = [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('manufacturerId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('isGeneric').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(['ACTIVE', 'ARCHIVED']),
];

router.route('/')
  .get(medicationController.findAll)
  .post(
    authenticate,
    authorize('ADMIN'),
    medicationRules, validate,
    medicationController.create
  );

router.route('/:id')
  .get(medicationController.findById)
  .put(
    authenticate,
    authorize('ADMIN'),
    medicationRules, validate,
    medicationController.update
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    medicationController.delete
  );

module.exports = router;
