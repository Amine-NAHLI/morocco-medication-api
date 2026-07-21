const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  formatSuccess(res, result, 'User registered successfully', 201);
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  formatSuccess(res, result, 'Login successful');
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  formatSuccess(res, result, 'Token refreshed successfully');
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user.id);
  formatSuccess(res, null, 'Logout successful');
});

const getMe = catchAsync(async (req, res) => {
  formatSuccess(res, req.user, 'User profile retrieved');
});

module.exports = { register, login, refreshToken, logout, getMe };
