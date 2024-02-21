import type { CreateNodes, CreateNodesContext, CreateNodesResult } from '@nx/devkit'

import lambdaInfraInference from './generators/aws-lambda/infra-generator/inferrence'
import lambdaRuntimeInference from './generators/aws-lambda/runtime-generator/inferrence'
import cdkAppInference from './generators/cdk-application/inferrence'
import type { CreateNodesFunctionMapper, NxAwsCdkPluginOptions } from './utils/inferrence'

const filePathToConfigurationMappings: CreateNodesFunctionMapper[] = [
  cdkAppInference,
  lambdaRuntimeInference,
  lambdaInfraInference,
]

export const createNodes: CreateNodes<NxAwsCdkPluginOptions> = [
  '**/project.json',
  async (
    projectConfigurationFilePath: string,
    opts: NxAwsCdkPluginOptions | undefined,
    context: CreateNodesContext,
  ) => {
    const nodesResult: CreateNodesResult[] = []
    for (const { predicate, createNodesFunction } of filePathToConfigurationMappings) {
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
        const resolvedProject = result.projects[key]
        if (!resolvedProject) {
          result.projects[key] = value
        } else {
          resolvedProject.targets = { ...resolvedProject.targets, ...value.targets }
        }
      }
    }
  }

  return result
}
