const ApiError = require('../../src/utils/ApiError');
const { formatSuccess, formatError } = require('../../src/utils/responseFormatter');
const logger = require('../../src/utils/logger');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ApiError', () => {
  it('should create an error with default isOperational = true', () => {
    const err = new ApiError(400, 'Bad Request');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad Request');
    expect(err.isOperational).toBe(true);
    expect(err.stack).toBeDefined();
  });

  it('should create an error with custom stack', () => {
    const err = new ApiError(500, 'Server Error', false, 'custom stack');
    expect(err.isOperational).toBe(false);
    expect(err.stack).toBe('custom stack');
  });
});

describe('ResponseFormatter', () => {
  describe('formatSuccess', () => {
    it('should send a success response without meta', () => {
      const res = mockRes();
      formatSuccess(res, { id: 1 }, 'OK', 200);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'OK',
        data: { id: 1 }
      });
    });

    it('should send a success response with meta', () => {
      const res = mockRes();
      formatSuccess(res, [{ id: 1 }], 'OK', 200, { total: 1 });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'OK',
        data: [{ id: 1 }],
        meta: { total: 1 }
      });
    });
  });

  describe('formatError', () => {
    it('should send an error response without errors array', () => {
      const res = mockRes();
      formatError(res, 'Not Found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Not Found'
      });
    });

    it('should send an error response with errors array', () => {
      const res = mockRes();
      formatError(res, 'Validation Error', 400, [{ name: 'required' }]);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation Error',
        errors: [{ name: 'required' }]
      });
    });
  });
});

describe('Logger', () => {
  it('should log info messages', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('test info');
    expect(spy).toHaveBeenCalledWith('[INFO] test info');
    spy.mockRestore();
  });

  it('should log error messages', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('test error');
    expect(spy).toHaveBeenCalledWith('[ERROR] test error');
    spy.mockRestore();
  });

  it('should log warn messages', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    logger.warn('test warn');
    expect(spy).toHaveBeenCalledWith('[WARN] test warn');
    spy.mockRestore();
  });
});
