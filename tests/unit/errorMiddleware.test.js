const ApiError = require('../../src/utils/ApiError');
const { errorConverter, errorHandler } = require('../../src/middlewares/error.middleware');

// Helper to create mock req/res/next
const mockReq = () => ({});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};
const mockNext = jest.fn();

describe('Error Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('errorConverter', () => {
    it('should pass ApiError instances through unchanged', () => {
      const error = new ApiError(400, 'Bad Request');
      errorConverter(error, mockReq(), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should convert generic errors to ApiError', () => {
      const error = new Error('Something went wrong');
      errorConverter(error, mockReq(), mockRes(), mockNext);
      const converted = mockNext.mock.calls[0][0];
      expect(converted).toBeInstanceOf(ApiError);
      expect(converted.statusCode).toBe(500);
      expect(converted.message).toBe('Something went wrong');
    });

    it('should use statusCode from error if present', () => {
      const error = new Error('Not Found');
      error.statusCode = 404;
      errorConverter(error, mockReq(), mockRes(), mockNext);
      const converted = mockNext.mock.calls[0][0];
      expect(converted.statusCode).toBe(404);
    });
  });

  describe('errorHandler', () => {
    it('should format error response in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new ApiError(400, 'Validation failed');
      const res = mockRes();
      errorHandler(error, mockReq(), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Validation failed' })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production for non-operational errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new ApiError(500, 'Database crash', false);
      const res = mockRes();
      errorHandler(error, mockReq(), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Internal Server Error' })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should show operational error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new ApiError(404, 'Not Found', true);
      const res = mockRes();
      errorHandler(error, mockReq(), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Not Found' })
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
