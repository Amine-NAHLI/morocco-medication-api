module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/docs/**',
    '!src/routes/api/v1/index.js',
    '!src/routes/index.js',
    '!src/routes/web/**',
    '!src/routes/api/v1/medications.routes.js',
    '!src/routes/api/v1/organizations.routes.js',
    '!src/routes/api/v1/reimbursements.routes.js',
    '!src/controllers/page.controller.js',
    '!src/middlewares/auth.middleware.js'
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
};
