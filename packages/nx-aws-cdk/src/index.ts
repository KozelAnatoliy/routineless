import { CreateNodes, CreateNodesContext, CreateNodesFunction, CreateNodesResult } from '@nx/devkit'
import { existsSync } from 'fs'
import { dirname } from 'path'

type NxAwsCdkPluginOptions = object
type CreateNodesFunctionMapper = Array<
  [(projectConfigFilePath: string) => boolean, createNodesFunction: CreateNodesFunction<NxAwsCdkPluginOptions>]
>

const createCdkAppNode: CreateNodesFunction<NxAwsCdkPluginOptions> = (projectConfigFilePath: string) => {
  const projectRoot = dirname(projectConfigFilePath)

  return {
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
  }
}

const filePathToConfigurationMapper: CreateNodesFunctionMapper = [
  [(projectConfigFilePath) => existsSync(projectConfigFilePath.replace('project.json', 'cdk.json')), createCdkAppNode],
]

export const createNodes: CreateNodes<NxAwsCdkPluginOptions> = [
  '**/project.json',
  async (
    projectConfigurationFilePath: string,
    opts: NxAwsCdkPluginOptions | undefined,
    context: CreateNodesContext,
  ) => {
    const nodesResult: CreateNodesResult[] = []
    for (const [predicate, createNodesFunction] of filePathToConfigurationMapper) {
      if (predicate(projectConfigurationFilePath)) {
        nodesResult.push(await createNodesFunction(projectConfigurationFilePath, opts, context))
      }
    }

    return mergeCreateNodesResults(nodesResult)
  },
]

const mergeCreateNodesResults = (createNodesResults: CreateNodesResult[]): CreateNodesResult => {
  const result: CreateNodesResult = {}
  for (const createNodesResult of createNodesResults) {
    if (createNodesResult.projects) {
      result.projects = result.projects ?? {}
      for (const [key, value] of Object.entries(createNodesResult.projects)) {
        result.projects[key] = { ...(result.projects[key] ?? {}), ...value }
      }
    }
  }

  return result
}
