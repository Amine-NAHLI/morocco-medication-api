const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const authController = require('../../../controllers/auth.controller');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Password must contain 8 to 128 characters'),
    body('name').optional().isString(),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  authController.refreshToken
);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/users/:id/role', authenticate, authorize('ADMIN'), [
  body('role').isIn(['ADMIN', 'USER']).withMessage('Role must be ADMIN or USER'),
], validate, authController.setRole);

module.exports = router;
