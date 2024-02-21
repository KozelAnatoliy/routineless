import type { CreateNodesFunction } from '@nx/devkit'

export type NxAwsCdkPluginOptions = object
export type CreateNodesFunctionMapper = {
  predicate: (projectConfigFilePath: string) => boolean
  createNodesFunction: CreateNodesFunction<NxAwsCdkPluginOptions>
}
