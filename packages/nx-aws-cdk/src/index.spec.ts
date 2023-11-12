import { CreateNodesContext } from '@nx/devkit'

import { createNodes } from './index'

describe('nx-aws-cdk', () => {
  describe('createNodes', () => {
    const projectName = 'project'
    const projectRoot = `/path/to/${projectName}`
    const projectCdkConfigPath = `${projectRoot}/cdk.json`

    it('should filter by cdk.json', () => {
      expect(createNodes[0]).toBe('**/cdk.json')
    })

    it('should add cdk and localstack targets', () => {
      const nodes = createNodes[1](projectCdkConfigPath, {}, {} as CreateNodesContext)

      expect(nodes).toEqual({
        projects: {
          [projectRoot]: {
            targets: {
              localstack: {
                executor: '@routineless/nx-aws-cdk:localstack',
              },
              cdk: {
                executor: '@routineless/nx-aws-cdk:cdk',
                dependsOn: ['build'],
              },
            },
          },
        },
      })
    })
  })
})
