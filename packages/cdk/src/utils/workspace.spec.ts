import { ProjectGraph, readCachedProjectGraph, workspaceRoot } from '@nx/devkit'

import { getProjectName } from './workspace'

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  workspaceRoot: '/users/username/projects/workspace',
  readCachedProjectGraph: jest.fn(),
}))

const mockedReadCachedProjectGraph = jest.mocked(readCachedProjectGraph)

describe('Workspace', () => {
  describe('getProjectName', () => {
    const testPath = `${workspaceRoot}/apps/aws-lambda/runtime/src/dir`
    const projectGraph: ProjectGraph = {
      nodes: {
        'aws-lambda-runtime': {
          name: 'aws-lambda-runtime',
          type: 'app',
          data: {
            root: 'apps/aws-lambda/runtime',
            sourceRoot: 'apps/aws-lambda/runtime/src',
            targets: {},
          },
        },
        infra: {
          name: 'infra',
          type: 'app',
          data: {
            root: 'apps/infra',
            sourceRoot: 'apps/infra/src',
            targets: {
              build: {
                options: {
                  outputPath: 'dist/apps/infra',
                },
              },
              cdk: {
                executor: '@routineless/nx-aws-cdk:cdk',
              },
            },
          },
        },
      },
      dependencies: {},
    } as ProjectGraph

    it('should return resolved project name', () => {
      const projectName = getProjectName(`${workspaceRoot}/apps/aws-lambda/src/dir`, {
        nodes: {
          'aws-lambda': {
            name: 'aws-lambda',
            type: 'app',
            data: {
              root: 'apps/aws-lambda',
              sourceRoot: 'apps/aws-lambda/src',
              targets: {},
            },
          },
        },
        dependencies: {},
      } as ProjectGraph)

      expect(projectName).toEqual('aws-lambda')
    })

    it('should return resolved project name with nested dir', () => {
      const projectName = getProjectName(testPath, projectGraph)

      expect(projectName).toEqual('aws-lambda-runtime')
    })

    it('should return resolved project name from dist folder', () => {
      mockedReadCachedProjectGraph.mockReturnValue(projectGraph)

      const projectName = getProjectName(`${workspaceRoot}/dist/apps/aws-lambda/runtime/src/dir`)

      expect(projectName).toEqual('aws-lambda-runtime')
    })

    it('should return resolved project name from cdk dist folder', () => {
      mockedReadCachedProjectGraph.mockReturnValue(projectGraph)

      const projectName = getProjectName(`${workspaceRoot}/dist/apps/infra/apps/aws-lambda/runtime/src/dir`)

      expect(projectName).toEqual('aws-lambda-runtime')
    })

    it('should return resolved project name from cached project graph', () => {
      mockedReadCachedProjectGraph.mockReturnValue(projectGraph)
      const projectName = getProjectName(testPath)

      expect(projectName).toEqual('aws-lambda-runtime')
    })

    it('should throw error if project graph is empty', () => {
      const error = new Error('Project graph is empty')
      mockedReadCachedProjectGraph.mockImplementation(() => {
        throw error
      })

      expect(() => getProjectName(testPath)).toThrow(error)
    })

    it('should return undefined if there are no projects with resolved name in the graph', () => {
      mockedReadCachedProjectGraph.mockReturnValue(projectGraph)

      const projectName = getProjectName(`${workspaceRoot}/apps/unknown-project/src/dir`)

      expect(projectName).toBeUndefined()
    })
  })
})
