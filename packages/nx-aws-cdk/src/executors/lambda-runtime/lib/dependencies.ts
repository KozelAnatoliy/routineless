import {
  ExecutorContext,
  ProjectGraph,
  ProjectGraphDependency,
  ProjectGraphExternalNode,
  ProjectGraphProjectNode,
  workspaceRoot,
} from '@nx/devkit'
import { getHelperDependenciesFromProjectGraph } from '@nx/js'
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils'
import type { TsconfigRaw } from 'esbuild'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { PatternTrie } from '../../../utils/trie'
import { NormalizedLambdaRuntimeExecutorOptions } from '../schema'

export type ResolveDependenciesOutput = {
  resolved: DependentBuildableProjectNode[]
  excluded: DependentBuildableProjectNode[]
}

export const getPackageName = (node: DependentBuildableProjectNode): string => {
  return isInternalProjectNode(node.node) ? node.name : node.node.data.packageName
}

export const getPackageVersion = (node: DependentBuildableProjectNode): string => {
  if (!isInternalProjectNode(node.node)) return node.node.data.version

  const packageJsonPath = join(node.node.data.root, 'package.json')
  if (!existsSync(packageJsonPath)) {
    return '0.0.0'
  }
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  return packageJson.version
}

export const dependenciesReducer = (
  acc: { internal: DependentBuildableProjectNode[]; external: DependentBuildableProjectNode[] },
  dep: DependentBuildableProjectNode,
) => {
  if (isInternalProjectNode(dep.node)) {
    acc.internal.push(dep)
  } else {
    acc.external.push(dep)
  }
  return acc
}

export const resolveDependencies = (
  context: ExecutorContext,
  graph: ProjectGraph,
  options: NormalizedLambdaRuntimeExecutorOptions,
): ResolveDependenciesOutput => {
  const { includeInternal, thirdParty } = options
  // const internalDepsPackageNameMap = getInternalDepsPackageNameMap(context, options)
  const internalDepsPackageNameResolver = getInternalDepsPackageNameResolver()

  const deps = new Map<string, DependentBuildableProjectNode>()
  const excluded = new Map<string, DependentBuildableProjectNode>()
  const externalPatternTrie = new PatternTrie(options.external)

  const recur = (dep: DependentBuildableProjectNode['node'], includeInternal: boolean, thirdParty: boolean) => {
    //dep name will be different from node name because node name does not include npm scope
    // @org/package -> dep name
    // package -> node name
    // external packages has same name and node name prefixed wih npm:
    // node name should be used to get the node from the graph
    let depName = dep.name
    if (isInternalProjectNode(dep)) {
      depName = internalDepsPackageNameResolver(dep)
    }
    const buildableProjectNode = {
      name: depName,
      outputs: [],
      node: dep,
    }

    if (deps.has(depName)) return
    if (isExcluded(buildableProjectNode, includeInternal, thirdParty, externalPatternTrie)) {
      excluded.set(depName, buildableProjectNode)
      return
    }
    deps.set(depName, buildableProjectNode)

    const nodeName = dep.name

    const allDeps = graph.dependencies[nodeName] || []
    const { externalDeps, internalDeps } = allDeps.reduce(dependenciesNodesReduced(graph), {
      externalDeps: [],
      internalDeps: [],
    })

    for (const transitiveDep of [...externalDeps, ...internalDeps]) {
      recur(transitiveDep, includeInternal, thirdParty)
    }
  }

  const projectDeps = graph.dependencies[context.projectName!] || []
  const { externalDeps, internalDeps } = projectDeps.reduce(dependenciesNodesReduced(graph), {
    externalDeps: [],
    internalDeps: [],
  })
  const helperDependencies = Array.from(
    getHelperDependenciesFromProjectGraph(context.root, context.projectName!, graph)
      .reduce((acc, dep) => acc.add(dep.target), new Set<string>())
      .values(),
  )
    .map((helperName) => graph.externalNodes?.[helperName])
    .filter((helperNode) => helperNode) as ProjectGraphExternalNode[]

  for (const projDep of [...externalDeps, ...internalDeps, ...helperDependencies]) {
    recur(projDep, includeInternal, thirdParty)
  }

  return {
    resolved: Array.from(deps.values()),
    excluded: Array.from(excluded.values()),
  }
}

const getInternalDepsPackageNameResolver = (): ((node: ProjectGraphProjectNode) => string) => {
  const tsConfig = getRootTsConfig()
  // "paths": {
  //   "@routineless/cdk": ["packages/cdk/src/index.ts"],
  //   "@routineless/nx-aws-cdk": ["packages/nx-aws-cdk/src/*"]
  // }
  const tsConfigPaths = tsConfig.compilerOptions?.paths || {}
  const sourcePathsAliasMap = new Map<string, string>()
  const sourcePathsTrie = new PatternTrie()

  for (const [alias, paths] of Object.entries(tsConfigPaths)) {
    for (const path of paths) {
      sourcePathsAliasMap.set(path, alias)
      sourcePathsTrie.add(path)
    }
  }

  return (node: ProjectGraphProjectNode) => {
    const tsConfigApplicablePaths = sourcePathsTrie.getAll(node.data.root)
    if (tsConfigApplicablePaths[0]) {
      return sourcePathsAliasMap.get(tsConfigApplicablePaths[0])!
    }
    return node.name
  }
}

const dependenciesNodesReduced = (graph: ProjectGraph) => {
  return (
    acc: { externalDeps: ProjectGraphExternalNode[]; internalDeps: ProjectGraphProjectNode[] },
    node: ProjectGraphDependency,
  ) => {
    const external = graph.externalNodes?.[node.target]
    if (external) {
      acc.externalDeps.push(external)
      return acc
    }
    const internal = graph.nodes[node.target]
    if (internal) acc.internalDeps.push(internal)

    return acc
  }
}

const isInternalProjectNode = (
  node: ProjectGraphProjectNode | ProjectGraphExternalNode,
): node is ProjectGraphProjectNode => {
  return node.type === 'lib'
}

const isExcluded = (
  dep: DependentBuildableProjectNode,
  includeInternal: boolean,
  thirdParty: boolean,
  external: PatternTrie,
): boolean => {
  if (isInternalProjectNode(dep.node) && !includeInternal) return true
  if (!isInternalProjectNode(dep.node) && !thirdParty) return true

  // resolve node package name to check external
  const packageName = dep.name.replace('npm:', '')

  return external.has(packageName)
}

const getRootTsConfig = (): TsconfigRaw => {
  const tsConfigFileName = getRootTsConfigFileName()

  return JSON.parse(readFileSync(join(workspaceRoot, tsConfigFileName), 'utf-8'))
}

const getRootTsConfigFileName = (): string => {
  for (const tsConfigName of ['tsconfig.base.json', 'tsconfig.json']) {
    const tsConfigPath = join(workspaceRoot, tsConfigName)
    if (existsSync(tsConfigPath)) {
      return tsConfigName
    }
  }

  throw new Error('Could not find root tsconfig')
}
