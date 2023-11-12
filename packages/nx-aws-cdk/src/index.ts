import { CreateNodes } from '@nx/devkit'
import { dirname } from 'path'

type NxAwsCdkPluginOptions = object

export const createNodes: CreateNodes<NxAwsCdkPluginOptions> = [
  '**/cdk.json',
  (projectConfigurationFilePath: string) => {
    const projectRoot = dirname(projectConfigurationFilePath)

    return {
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
    }
  },
]
