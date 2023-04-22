const nxPreset = require('@nrwl/jest/preset').default

module.exports = {
  ...nxPreset,
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  coverageReporters: ['html', 'text'],
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
