import type { CreateNodesContext } from '@nx/devkit'
import { createNodes as jestCreateNodes } from '@nx/jest/plugin'
import { existsSync } from 'fs'

import lambdaInfraInferrence from './inferrence'

jest.mock('@nx/jest/plugin', () => ({
  createNodes: ['pattern', jest.fn()],
}))
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}))

const mockedJestCreateNodes = jest.mocked(jestCreateNodes[1])
const mockedExistsSync = jest.mocked(existsSync)

describe('lambdaInfraInferrence', () => {
  const { predicate, createNodesFunction } = lambdaInfraInferrence

  describe('predicate', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return true if runtime project exists', () => {
      mockedExistsSync.mockReturnValue(true)
      const projectConfigFilePath = '/path/to/infra/project.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/runtime')
      expect(result).toBe(true)
    })

    it('should return false if projectConfigFilePath does not include infra/project.json', () => {
      const projectConfigFilePath = '/path/to/other.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should return false if runtime project does not exist', () => {
      mockedExistsSync.mockReturnValue(false)
      const projectConfigFilePath = '/path/to/infra/project.json'

      const result = predicate(projectConfigFilePath)

      expect(mockedExistsSync).toHaveBeenCalledWith('/path/to/runtime')
      expect(result).toBe(false)
    })
  })

  describe('createNodesFunction', () => {
    const projectDir = 'path/to/infra'
    const projectConfigFilePath = `${projectDir}/project.json`

    const context: CreateNodesContext = {
      nxJsonConfiguration: {
        plugins: [],
      },
      workspaceRoot: 'root',
    }

    beforeEach(() => {
      mockedJestCreateNodes.mockResolvedValue({
        projects: {
          [projectDir]: {
            root: projectDir,
            targets: {
              test: {
                command: 'jest',
                options: {
                  cwd: projectDir,
                },
                cache: true,
              },
            },
          },
        },
      })
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return an empty object if the jest plugin is not enabled', async () => {
      const result = await createNodesFunction(projectConfigFilePath, undefined, context)

      expect(result).toEqual({})
    })

    it('should return empty object if jest config does not exist', async () => {
      mockedExistsSync.mockReturnValue(false)
      const contextWithJestPlugin: CreateNodesContext = {
        nxJsonConfiguration: {
          plugins: ['@nx/jest/plugin'],
        },
        workspaceRoot: 'root',
      }

      const result = await createNodesFunction(projectConfigFilePath, undefined, contextWithJestPlugin)

      expect(mockedExistsSync).toHaveBeenCalledWith('path/to/infra/jest.config.ts')
      expect(mockedJestCreateNodes).toHaveBeenCalledWith
      expect(result).toEqual({})
    })

    it('should return test target with build dependency', async () => {
      mockedExistsSync.mockReturnValue(true)
      const contextWithJestPlugin: CreateNodesContext = {
        nxJsonConfiguration: {
          plugins: ['@nx/jest/plugin'],
        },
        workspaceRoot: 'root',
      }

      const result = await createNodesFunction(projectConfigFilePath, undefined, contextWithJestPlugin)

      expect(result).toEqual({
        projects: {
          [projectDir]: {
            root: projectDir,
            targets: {
              test: {
                command: 'jest',
                options: {
                  cwd: projectDir,
                },
                cache: true,
                dependsOn: ['^build'],
              },
            },
          },
        },
      })
    })

    it('should respect jest input options', async () => {
      mockedExistsSync.mockReturnValue(true)
      const contextWithJestPlugin: CreateNodesContext = {
        nxJsonConfiguration: {
          plugins: [
            {
              plugin: '@nx/jest/plugin',
              options: {
                targetName: 'newTest',
              },
            },
          ],
        },
        workspaceRoot: 'root',
      }
      mockedJestCreateNodes.mockResolvedValue({
        projects: {
          [projectDir]: {
            root: projectDir,
            targets: {
              newTest: {
                command: 'jest',
                options: {
                  cwd: projectDir,
                },
                cache: true,
              },
            },
          },
        },
      })

      const result = await createNodesFunction(projectConfigFilePath, undefined, contextWithJestPlugin)

      expect(result).toEqual({
        projects: {
          [projectDir]: {
            root: projectDir,
            targets: {
              newTest: {
                command: 'jest',
                options: {
                  cwd: projectDir,
                },
                cache: true,
                dependsOn: ['^build'],
              },
            },
          },
        },
      })
    })
  })
})
