const formatSuccess = (res, data, message = 'Success', statusCode = 200, meta = null) => {
  const response = {
    status: 'success',
    message,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

const formatError = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    status: 'error',
    message,
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};

module.exports = {
  formatSuccess,
  formatError,
};
