import { Tree, readJson, readJsonFile, updateJson } from '@nx/devkit'
import type { ExecutorContext } from '@nx/devkit'
import { existsSync } from 'fs'
import * as path from 'path'

import { LambdaPreset } from '../generators/aws-lambda/schema'

const routinelessConfigPath = '.routineless.json'

export const getRoutinelessConfig = (context: Tree | ExecutorContext): RoutinelessConfig => {
  let routinelessConfig: RoutinelessConfig = {}
  if (isTree(context)) {
    if (!context.exists(routinelessConfigPath)) return routinelessConfig
    routinelessConfig = readJson<RoutinelessConfig>(context, routinelessConfigPath)
  } else {
    if (!existsSync(path.join(context.root, routinelessConfigPath))) return routinelessConfig
    routinelessConfig = readJsonFile<RoutinelessConfig>(path.join(context.root, routinelessConfigPath))
  }
  return routinelessConfig
}

const isTree = (context: Tree | ExecutorContext): context is Tree => {
  return (context as Tree).read !== undefined
}

export const updateRoutinelessConfig = (tree: Tree, updater: (config: RoutinelessConfig) => RoutinelessConfig) => {
  if (!tree.exists(routinelessConfigPath)) {
    tree.write(routinelessConfigPath, JSON.stringify({}))
  }
  updateJson(tree, routinelessConfigPath, updater)
}

export interface RoutinelessConfig {
  infraApp?: string
  defaultLambdaPreset?: LambdaPreset
}
