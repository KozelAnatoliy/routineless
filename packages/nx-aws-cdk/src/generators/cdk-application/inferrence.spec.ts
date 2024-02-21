import type { CreateNodesContext } from '@nx/devkit'
import { existsSync } from 'fs'

import cdkInferrence from './inferrence'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

const mockedExistsSync = jest.mocked(existsSync)

describe('cdkInferrence', () => {
  const { predicate, createNodesFunction } = cdkInferrence
  describe('predicate', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return true if cdk.json exists', () => {
      mockedExistsSync.mockReturnValue(true)
      const projectConfigFilePath = '/path/to/project.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/cdk.json')
      expect(result).toBe(true)
    })
    it('should return false if projectConfigFilePath does not include /project.json', () => {
      const projectConfigFilePath = '/path/to/other.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
    it('should return false if cdk.json does not exist', () => {
      mockedExistsSync.mockReturnValue(false)
      const projectConfigFilePath = '/path/to/project.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/cdk.json')
      expect(result).toBe(false)
    })
  })

  describe('createNodesFunction', () => {
    const context: CreateNodesContext = {
      nxJsonConfiguration: {},
      workspaceRoot: 'root',
    }
    it('should return a CreateNodesResult with the cdk and localstack targets', async () => {
      const projectConfigFilePath = '/path/to/project.json'
      const result = await createNodesFunction(projectConfigFilePath, undefined, context)
      expect(result).toEqual({
        projects: {
          '/path/to': {
            targets: {
              localstack: {
                executor: '@routineless/nx-aws-cdk:localstack',
              },
              cdk: {
                executor: '@routineless/nx-aws-cdk:cdk',
                configurations: {
                  development: {
                    env: 'dev',
                    resolve: true,
                    'hotswap-fallback': true,
                    concurrency: 3,
                  },
                  production: {
                    env: 'prod',
                    resolve: true,
                  },
                },
                dependsOn: ['build'],
              },
            },
          },
        },
      })
    })
  })
})
