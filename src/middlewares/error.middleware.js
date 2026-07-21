const ApiError = require('../utils/ApiError');
const { formatError } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (err && err.code === 'P2002') {
    error = new ApiError(409, `A record with this ${err.meta?.target?.join(', ') || 'unique value'} already exists`);
  } else if (err && err.code === 'P2025') {
    error = new ApiError(404, 'Resource not found');
  } else if (err && ['P2003', 'P2014'].includes(err.code)) {
    error = new ApiError(409, 'Operation conflicts with existing related data');
  } else if (err && err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    error = new ApiError(413, 'Uploaded file is too large');
  }
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

  if (statusCode >= 500) logger.error(err);

  formatError(res, message, statusCode, responseErrors);
};

module.exports = {
  errorConverter,
  errorHandler,
};
