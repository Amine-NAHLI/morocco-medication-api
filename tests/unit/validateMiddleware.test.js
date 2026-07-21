const validate = require('../../src/middlewares/validate.middleware');
const { validationResult } = require('express-validator');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Validate Middleware', () => {
  it('should call next() when there are no validation errors', () => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    const next = jest.fn();
    validate({}, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 400 with extracted errors when validation fails', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [
        { path: 'name', msg: 'Name is required' },
        { path: 'code', msg: 'Code is required' }
      ]
    });
    const res = mockRes();
    const next = jest.fn();
    validate({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Validation Error',
        errors: expect.arrayContaining([
          { name: 'Name is required' },
          { code: 'Code is required' }
        ])
      })
    );
  });
});
