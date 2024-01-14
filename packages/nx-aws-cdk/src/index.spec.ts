import { CreateNodesContext } from '@nx/devkit'
import { existsSync } from 'fs'

import { createNodes } from './index'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

const mockedExistsSync = jest.mocked(existsSync)

describe('nx-aws-cdk', () => {
  describe('createNodes', () => {
    const projectName = 'project'
    const projectRoot = `/path/to/${projectName}`
    const projectCdkConfigPath = `${projectRoot}/cdk.json`

    it('should filter by project.json', () => {
      expect(createNodes[0]).toBe('**/project.json')
    })

    it('should add cdk and localstack targets', async () => {
      mockedExistsSync.mockReturnValue(true)
      const nodes = await createNodes[1](projectCdkConfigPath, {}, {} as CreateNodesContext)

      expect(nodes).toEqual({
        projects: {
          [projectRoot]: {
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
