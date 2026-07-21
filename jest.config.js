module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/docs/**',
    '!src/routes/api/v1/index.js',
    '!src/routes/index.js',
    '!src/routes/web/**',
    '!src/controllers/page.controller.js'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testPathIgnorePatterns: ['<rootDir>/tests/db/'],
};
