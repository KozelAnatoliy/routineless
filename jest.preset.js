const nxPreset = require('@nx/jest/preset').default

module.exports = {
  ...nxPreset,
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testEnvironment: 'node',
  coverageReporters: ['text', 'cobertura'],
  collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
}
