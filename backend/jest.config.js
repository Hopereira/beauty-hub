/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/seeders/**',
    '!src/models/index.js',
  ],
  testTimeout: 10000,
  // Exclude integration tests that require DB unless RUN_INTEGRATION=true
  testPathIgnorePatterns: process.env.RUN_INTEGRATION ? [] : ['tests/integration'],
  setupFiles: ['./tests/setup.js'],
};
