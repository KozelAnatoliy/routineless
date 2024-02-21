import type { CreateNodesContext } from '@nx/devkit'
import { existsSync } from 'fs'

import lambdaRuntimeInferrence from './inferrence'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

const mockedExistsSync = jest.mocked(existsSync)

describe('lambdaRuntimeInferrence', () => {
  const { predicate, createNodesFunction } = lambdaRuntimeInferrence

  describe('predicate', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })
    it('should return true if infra project exists', () => {
      mockedExistsSync.mockReturnValue(true)
      const projectConfigFilePath = '/path/to/runtime/project.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/infra')
      expect(result).toBe(true)
    })

    it('should return false if projectConfigFilePath does not include runtime/project.json', () => {
      const projectConfigFilePath = '/path/to/other.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should return false if infra project does not exist', () => {
      mockedExistsSync.mockReturnValue(false)
      const projectConfigFilePath = '/path/to/runtime/project.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/infra')
      expect(result).toBe(false)
    })
  })

  describe('createNodesFunction', () => {
    const context: CreateNodesContext = {
      nxJsonConfiguration: {},
      workspaceRoot: 'root',
    }

    it('should return a CreateNodesResult with the lambda runtime build target', async () => {
      const projectConfigFilePath = 'path/to/runtime/project.json'
      const result = await createNodesFunction(projectConfigFilePath, undefined, context)
      expect(result).toEqual({
        projects: {
          'path/to/runtime': {
            targets: {
              build: {
                executor: '@routineless/nx-aws-cdk:lambda-runtime',
                inputs: ['production', '^production'],
                outputs: ['{options.outputPath}'],
                cache: true,
                dependsOn: ['^build'],
                defaultConfiguration: 'development',
                options: {
                  outputPath: 'dist/path/to/runtime',
                  tsConfig: 'path/to/runtime/tsconfig.app.json',
                },
                configurations: {
                  development: {
                    bundle: false,
                  },
                  production: {
                    minify: true,
                  },
                },
              },
            },
          },
        },
      })
    })
  })
})
