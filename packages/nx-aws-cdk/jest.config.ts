/* eslint-disable */
export default {
  displayName: 'nx-aws-cdk',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  testPathIgnorePatterns: ['/generatorFiles/'],
  collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts', '!**/generatorFiles/**', '!**/fixtures/**'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/nx-aws-cdk',
}
