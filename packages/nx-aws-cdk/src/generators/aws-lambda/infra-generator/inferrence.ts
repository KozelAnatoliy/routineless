import type { CreateNodesContext, CreateNodesFunction, PluginConfiguration } from '@nx/devkit'
import { JestPluginOptions, createNodes as jestCreateNodes } from '@nx/jest/plugin'
import { existsSync } from 'fs'
import { dirname } from 'path'

import type { CreateNodesFunctionMapper, NxAwsCdkPluginOptions } from '../../../utils/inferrence'

const createLambdaInfraNode: CreateNodesFunction<NxAwsCdkPluginOptions> = async (
  projectConfigFilePath: string,
  _: NxAwsCdkPluginOptions | undefined,
  context: CreateNodesContext,
) => {
  const projectRoot = dirname(projectConfigFilePath)
  const projectJestConfig = `${projectRoot}/jest.config.ts`
  let isJestPluginEnabled = false
  let jestOptions
  for (const pluginConfig of context.nxJsonConfiguration.plugins || []) {
    if (pluginConfig === '@nx/jest/plugin') {
      isJestPluginEnabled = true
    }
    if (isExtendedPluginConfiguration<JestPluginOptions>(pluginConfig) && pluginConfig.plugin === '@nx/jest/plugin') {
      isJestPluginEnabled = true
      jestOptions = pluginConfig.options
    }
  }

  if (!isJestPluginEnabled || !existsSync(projectJestConfig)) {
    return {}
  }

  const jestConstractedTarget = await jestCreateNodes[1](projectJestConfig, jestOptions, context)

  const targetName = jestOptions?.targetName ?? 'test'
  jestConstractedTarget.projects![projectRoot]!.targets![targetName]!.dependsOn = ['^build']

  return jestConstractedTarget
}
type ExtendendPluginConfiguration<T> = {
  plugin: string
  options?: T
}

const isExtendedPluginConfiguration = <T>(plugin: PluginConfiguration): plugin is ExtendendPluginConfiguration<T> => {
  return typeof plugin !== 'string'
}

const predicate = (projectConfigFilePath: string): boolean =>
  projectConfigFilePath.includes('/infra/project.json') &&
  existsSync(projectConfigFilePath.replace('/infra/project.json', '/runtime'))

const createNodes: CreateNodesFunctionMapper = {
  predicate,
  createNodesFunction: createLambdaInfraNode,
}

export default createNodes
