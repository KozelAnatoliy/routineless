import { CreateNodesContext } from '@nx/devkit'
import fs from 'fs'

import { createNodes } from './index'

jest.mock('fs')

const mockedFs = jest.mocked(fs)

describe('nx-aws-cdk', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('createNodes', () => {
    const projectName = 'project'
    const projectPath = `/path/to/${projectName}`
    const projectConfigPath = `${projectPath}/project.json`

    it('should filter by cdk.json', () => {
      expect(createNodes[0]).toBe('**/cdk.json')
    })

    it('should add cdk and localstack targets', () => {
      const projectConfig = {
        name: projectName,
        targets: {
          build: {
            executor: 'build',
          },
        },
      }
      mockedFs.readFileSync.mockReturnValueOnce(Buffer.from(JSON.stringify(projectConfig)))

      const nodes = createNodes[1](projectConfigPath, {}, {} as CreateNodesContext)

      expect(nodes).toEqual({
        projects: {
          [projectName]: {
            ...projectConfig,
            targets: {
              ...projectConfig.targets,
              localstack: {
                executor: '@routineless/nx-aws-cdk:localstack',
              },
              cdk: {
                executor: '@routineless/nx-aws-cdk:cdk',
                dependsOn: ['build'],
              },
            },
            root: projectPath,
          },
        },
      })
    })
  })
})
