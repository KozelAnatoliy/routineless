import { Tree, readJson, updateJson } from '@nrwl/devkit'

const routinelessConfigPath = '.routineless.json'

export const getRoutinelessConfig = (tree: Tree): RoutinelessConfig | undefined => {
  if (!tree.exists(routinelessConfigPath)) return
  const routinelessConfig = readJson<RoutinelessConfig>(tree, routinelessConfigPath)
  return routinelessConfig
}

export const updateRoutinelessConfig = (tree: Tree, updater: (config: RoutinelessConfig) => RoutinelessConfig) => {
  if (!tree.exists(routinelessConfigPath)) {
    tree.write(routinelessConfigPath, JSON.stringify({}))
  }
  updateJson(tree, routinelessConfigPath, updater)
}

export interface RoutinelessConfig {
  infraApp: string
}
