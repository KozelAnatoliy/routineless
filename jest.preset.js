const nxPreset = require('@nrwl/jest/preset').default
const { dirname } = require('path')
const appDir = dirname(require.main.filename)

module.exports = {
  ...nxPreset,
  testMatch: ['**/+(*.)+(spec).+(ts|js)?(x)'],
  coverageReporters: ['text'],
  collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/index.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
}
