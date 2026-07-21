const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const createEntityRoutes = (controller, rules = []) => {
  const router = express.Router();
  const idRule = [param('id').isInt({ min: 1 }).toInt(), validate];
  router.route('/').get(controller.list).post(authenticate, authorize('ADMIN'), rules, validate, controller.create);
  router.route('/:id')
    .get(idRule, controller.detail)
    .patch(authenticate, authorize('ADMIN'), idRule, rules, validate, controller.update)
    .put(authenticate, authorize('ADMIN'), idRule, rules, validate, controller.update)
    .delete(authenticate, authorize('ADMIN'), idRule, controller.remove);
  return router;
};

const text = (name, required = false) => (required ? body(name).trim().notEmpty().isLength({ max: 255 }) : body(name).optional({ nullable: true }).trim().isLength({ max: 255 }));
module.exports = { createEntityRoutes, text, body };
