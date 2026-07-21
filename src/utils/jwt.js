const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const ApiError = require('../utils/ApiError');
const { getAuthConfig, validateAuthDurations } = require('../config/env');

validateAuthDurations();
const { accessSecret: JWT_SECRET, refreshSecret: JWT_REFRESH_SECRET, accessExpiresIn: JWT_EXPIRES_IN, refreshExpiresIn: JWT_REFRESH_EXPIRES_IN } = getAuthConfig();

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN, jwtid: randomUUID() }
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired access token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};
