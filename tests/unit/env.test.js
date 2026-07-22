const env = require('../../src/config/env');

const keys = [
  'NODE_ENV', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN', 'CORS_ORIGINS', 'MAX_UPLOAD_SIZE_BYTES',
  'MAX_PAGE_SIZE', 'SYNC_SCHEDULER_ENABLED', 'SYNC_SCHEDULER_INTERVAL_MS',
];
let original;

beforeEach(() => {
  original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
});

afterEach(() => {
  keys.forEach((key) => {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  });
});

describe('environment configuration', () => {
  test('uses safe development defaults and disabled scheduler defaults', () => {
    expect(env.getAuthConfig()).toMatchObject({ accessExpiresIn: '15m', refreshExpiresIn: '7d' });
    expect(env.getHttpConfig()).toMatchObject({ corsOrigins: ['http://127.0.0.1:5500', 'http://localhost:5500'], maxUploadSize: 5 * 1024 * 1024, maxPageSize: 100, schedulerEnabled: false });
  });

  test('parses configured HTTP values and enables the scheduler outside tests', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = 'http://one.test, http://two.test';
    process.env.MAX_UPLOAD_SIZE_BYTES = '1024';
    process.env.MAX_PAGE_SIZE = '50';
    process.env.SYNC_SCHEDULER_ENABLED = 'true';
    process.env.SYNC_SCHEDULER_INTERVAL_MS = '60000';
    expect(env.getHttpConfig()).toEqual({ corsOrigins: ['http://one.test', 'http://two.test'], maxUploadSize: 1024, maxPageSize: 50, schedulerEnabled: true, schedulerIntervalMs: 60000 });
  });

  test('rejects malformed numeric and JWT duration configuration', () => {
    process.env.MAX_UPLOAD_SIZE_BYTES = 'zero';
    expect(() => env.getHttpConfig()).toThrow('MAX_UPLOAD_SIZE_BYTES');
    process.env.MAX_UPLOAD_SIZE_BYTES = '1';
    process.env.JWT_EXPIRES_IN = 'never';
    expect(() => env.validateAuthDurations()).toThrow('JWT expiry values');
  });

  test('requires distinct, strong JWT secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    process.env.JWT_REFRESH_SECRET = 'short';
    expect(() => env.getAuthConfig()).toThrow('JWT secrets must be distinct');
    process.env.JWT_SECRET = 'a-very-long-production-access-secret-123';
    process.env.JWT_REFRESH_SECRET = 'a-very-long-production-refresh-secret-456';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.JWT_REFRESH_EXPIRES_IN = '14d';
    expect(env.getAuthConfig()).toMatchObject({ accessExpiresIn: '30m', refreshExpiresIn: '14d' });
    expect(() => env.validateAuthDurations()).not.toThrow();
  });
});
