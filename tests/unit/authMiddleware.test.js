const { authenticate, authorize } = require('../../src/middlewares/auth.middleware');
const ApiError = require('../../src/utils/ApiError');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  const mockRes = () => ({});
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate a valid token', () => {
      const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET || 'dev-secret-key');
      const req = { headers: { authorization: `Bearer ${token}` } };
      
      authenticate(req, mockRes(), mockNext);
      
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail if no authorization header is present', () => {
      const req = { headers: {} };
      authenticate(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should fail if authorization format is invalid', () => {
      const req = { headers: { authorization: 'Basic token' } };
      authenticate(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should fail with invalid token', () => {
      const req = { headers: { authorization: 'Bearer invalidtoken' } };
      authenticate(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('authorize', () => {
    it('should allow user with required role', () => {
      const req = { user: { role: 'ADMIN' } };
      const middleware = authorize('ADMIN');
      middleware(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow user with one of required roles', () => {
      const req = { user: { role: 'USER' } };
      const middleware = authorize('ADMIN', 'USER');
      middleware(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject user with insufficient role', () => {
      const req = { user: { role: 'USER' } };
      const middleware = authorize('ADMIN');
      middleware(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
    });

    it('should reject if user is not authenticated', () => {
      const req = {};
      const middleware = authorize('ADMIN');
      middleware(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
    });
  });
});
