const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to verify JWT access token from Authorization header.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Authentication required. Please provide a valid token.'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to check if the authenticated user has one of the allowed roles.
 * Must be used AFTER authenticate middleware.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
