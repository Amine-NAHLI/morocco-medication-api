module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/db/**/*.test.js'],
};
