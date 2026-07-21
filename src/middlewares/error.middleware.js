const ApiError = require('../utils/ApiError');
const { formatError } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;
  const responseErrors = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  logger.error(err);

  formatError(res, message, statusCode, responseErrors);
};

module.exports = {
  errorConverter,
  errorHandler,
};
