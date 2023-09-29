/* eslint-disable */
export default {
  displayName: 'routineless',
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
  collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts', '!**/generatorFiles/**'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/nx-aws-cdk',
}
