import { ProjectGraph, readCachedProjectGraph, workspaceRoot } from '@nx/devkit'
import { AssetCode, Code } from 'aws-cdk-lib/aws-lambda'

import { getProjectName } from '../utils/workspace'
import { getLambdaCode } from './code'

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  workspaceRoot: '/users/username/projects/workspace',
  readCachedProjectGraph: jest.fn(),
}))
jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Code: {
    ...jest.requireActual('aws-cdk-lib/aws-lambda').Code,
    fromAsset: jest.fn(),
  },
}))
jest.mock('../utils/workspace')

const mockedReadCachedProjectGraph = jest.mocked(readCachedProjectGraph)
const mockedLambdaCode = jest.mocked(Code)
const mockedGetProjectName = jest.mocked(getProjectName)

describe('Lambda', () => {
  describe('getLambdaCode', () => {
    const lambdaRuntimeProjectName = 'aws-lambda-runtime'
    const projectGraph: ProjectGraph = {
      nodes: {
        'aws-lambda-infra': {
          name: 'aws-lambda-infra',
          type: 'app',
          data: {
            root: 'apps/aws-lambda/infra',
            sourceRoot: 'apps/aws-lambda/infra/src',
            targets: {},
          },
        },
        [`${lambdaRuntimeProjectName}`]: {
          name: lambdaRuntimeProjectName,
          type: 'app',
          data: {
            root: 'apps/aws-lambda/runtime',
            sourceRoot: 'apps/aws-lambda/runtime/src',
            targets: {
              build: {
                options: {
                  outputPath: 'dist/apps/aws-lambda/runtime',
                },
              },
            },
          },
        },
      },
      dependencies: {},
    } as ProjectGraph

    beforeEach(() => {
      mockedReadCachedProjectGraph.mockReturnValue(projectGraph)
      mockedGetProjectName.mockReturnValue('aws-lambda-infra')
      mockedLambdaCode.fromAsset.mockReturnValue({} as AssetCode)
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return lambda code', () => {
      getLambdaCode()

      expect(mockedLambdaCode.fromAsset).toHaveBeenCalledWith(`${workspaceRoot}/dist/apps/aws-lambda/runtime`)
    })

    it('should return lambda code for provided project name', () => {
      getLambdaCode({ projectName: 'aws-lambda-runtime' })

      expect(mockedGetProjectName).not.toHaveBeenCalled()
      expect(mockedLambdaCode.fromAsset).toHaveBeenCalledWith(`${workspaceRoot}/dist/apps/aws-lambda/runtime`)
    })

    it('should fail with unresolved project name', () => {
      mockedGetProjectName.mockReturnValue(undefined)

      expect(() => getLambdaCode()).toThrow('Could resolve project name')
    })

    describe('fail with unresolved project build target output path', () => {
      it('should fail if node was not found', () => {
        const projectName = 'unknown-project'

        expect(() => getLambdaCode({ projectName })).toThrow(
          `Could not resolve ${projectName} build target output path`,
        )
      })

      it('should fail if node missing targets', () => {
        mockedReadCachedProjectGraph.mockReturnValue({
          nodes: {
            [`${lambdaRuntimeProjectName}`]: {
              name: lambdaRuntimeProjectName,
              type: 'app',
              data: {
                root: 'apps/aws-lambda/runtime',
                sourceRoot: 'apps/aws-lambda/runtime/src',
              },
            },
          },
          dependencies: {},
        } as ProjectGraph)

        expect(() => getLambdaCode()).toThrow(`Could not resolve ${lambdaRuntimeProjectName} build target output path`)
      })

      it('should fail if node missing build target', () => {
        mockedReadCachedProjectGraph.mockReturnValue({
          nodes: {
            [`${lambdaRuntimeProjectName}`]: {
              name: lambdaRuntimeProjectName,
              type: 'app',
              data: {
                root: 'apps/aws-lambda/runtime',
                sourceRoot: 'apps/aws-lambda/runtime/src',
                targets: {},
              },
            },
          },
          dependencies: {},
        } as ProjectGraph)

        expect(() => getLambdaCode()).toThrow(`Could not resolve ${lambdaRuntimeProjectName} build target output path`)
      })

      it('should fail if build target missing outputPath option', () => {
        mockedReadCachedProjectGraph.mockReturnValue({
          nodes: {
            [`${lambdaRuntimeProjectName}`]: {
              name: lambdaRuntimeProjectName,
              type: 'app',
              data: {
                root: 'apps/aws-lambda/runtime',
                sourceRoot: 'apps/aws-lambda/runtime/src',
                targets: {
                  build: {
                    executor: '@nx/node:package',
                    options: {},
                  },
                },
              },
            },
          },
          dependencies: {},
        } as ProjectGraph)

        expect(() => getLambdaCode()).toThrow(`Could not resolve ${lambdaRuntimeProjectName} build target output path`)
      })
    })
  })
})
