const ApiError = require('../utils/ApiError');

const DEFAULT_CORS_ORIGINS = ['http://localhost:3000'];

const parsePositiveInt = (value, fallback, name) => {
  const parsed = Number.parseInt(value, 10);
  if (value === undefined || value === '') return fallback;
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseOrigins = (value) => (value ? value.split(',').map((origin) => origin.trim()).filter(Boolean) : DEFAULT_CORS_ORIGINS);

const isWeakSecret = (value) => !value || value.length < 32 || /^(dev|default|change|your|replace|secret)/i.test(value);

const getAuthConfig = () => {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production' && (isWeakSecret(accessSecret) || isWeakSecret(refreshSecret) || accessSecret === refreshSecret)) {
    throw new Error('JWT secrets must be distinct, non-default values of at least 32 characters in production');
  }
  return {
    accessSecret: accessSecret || 'development-only-access-secret-change-me',
    refreshSecret: refreshSecret || 'development-only-refresh-secret-change-me',
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
};

const getHttpConfig = () => ({
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  maxUploadSize: parsePositiveInt(process.env.MAX_UPLOAD_SIZE_BYTES, 5 * 1024 * 1024, 'MAX_UPLOAD_SIZE_BYTES'),
  maxPageSize: parsePositiveInt(process.env.MAX_PAGE_SIZE, 100, 'MAX_PAGE_SIZE'),
  schedulerEnabled: process.env.SYNC_SCHEDULER_ENABLED === 'true' && process.env.NODE_ENV !== 'test',
  schedulerIntervalMs: parsePositiveInt(process.env.SYNC_SCHEDULER_INTERVAL_MS, 24 * 60 * 60 * 1000, 'SYNC_SCHEDULER_INTERVAL_MS'),
});

const validateAuthDurations = () => {
  const { accessExpiresIn, refreshExpiresIn } = getAuthConfig();
  if (!/^\d+[smhd]$/.test(accessExpiresIn) || !/^\d+[smhd]$/.test(refreshExpiresIn)) {
    throw new ApiError(500, 'JWT expiry values must use a positive number followed by s, m, h, or d', false);
  }
};

module.exports = { getAuthConfig, getHttpConfig, validateAuthDurations };
