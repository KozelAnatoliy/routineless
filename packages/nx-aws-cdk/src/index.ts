import { CreateNodes, ProjectConfiguration, parseJson } from '@nx/devkit'
import fs from 'fs'
import { dirname } from 'path'

type NxAwsCdkPluginOptions = object

export const createNodes: CreateNodes<NxAwsCdkPluginOptions> = [
  '**/cdk.json',
  // opts: NxAwsCdkPluginOptions | undefined, context: CreateNodesContext
  (projectConfigurationFilePath: string) => {
    const projectConfigurationFile = fs.readFileSync(projectConfigurationFilePath)
    const projectConfiguration: ProjectConfiguration = parseJson(projectConfigurationFile.toString())
    const projectRoot = dirname(projectConfigurationFilePath)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const projectName = projectConfiguration.name!

    return {
      projects: {
        [projectName]: {
          ...projectConfiguration,
          targets: {
            ...projectConfiguration.targets,
            localstack: {
              executor: '@routineless/nx-aws-cdk:localstack',
            },
            cdk: {
              executor: '@routineless/nx-aws-cdk:cdk',
              dependsOn: ['build'],
            },
          },
          root: projectRoot,
        },
      },
    }
  },
]
