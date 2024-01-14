import type { ExecutorContext } from '@nx/devkit'
import { joinPathFragments, readJsonFile, writeJsonFile } from '@nx/devkit'
import {
  CopyPackageJsonOptions,
  TypeCheckOptions,
  runTypeCheck as _runTypeCheck,
  copyAssets,
  copyPackageJson,
  printDiagnostics,
} from '@nx/js'
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils'
import * as esbuild from 'esbuild'
import { existsSync, removeSync } from 'fs-extra'
import path from 'path'

import { getPackageName, resolveDependencies } from './lib/dependencies'
import { build, getOutExtension } from './lib/esbuild-helper'
import { LambdaRuntimeExecutorOptions, NormalizedLambdaRuntimeExecutorOptions } from './schema'

const defaultExternal = ['@aws-sdk/*']

const normalizeOptions = (
  options: LambdaRuntimeExecutorOptions,
  context: ExecutorContext,
): NormalizedLambdaRuntimeExecutorOptions => {
  const projectConfig = context.projectsConfigurations!.projects![context.projectName!]!

  // If we're not generating package.json file, then copy it as-is as an asset.
  const assets = options.generatePackageJson
    ? options.assets
    : [...options.assets, joinPathFragments(projectConfig.root, 'package.json')]

  let userDefinedBuildOptions: esbuild.BuildOptions = {}
  if (options.esbuildConfig) {
    const userDefinedConfig = path.resolve(context.root, options.esbuildConfig)

    if (options.esbuildOptions) throw new Error(`Cannot use both esbuildOptions and esbuildConfig options.`)
    if (!existsSync(userDefinedConfig)) throw new Error(`Path of esbuildConfig does not exist: ${userDefinedConfig}`)
    userDefinedBuildOptions = require(userDefinedConfig)
  } else if (options.esbuildOptions) {
    userDefinedBuildOptions = options.esbuildOptions
  }

  const partialOptions = {
    main: options.main ?? path.join(context.root, projectConfig.root, 'src', 'main.ts'),
    platform: 'node' as const,
    target: 'esnext' as const,
    deleteOutputPath: !!options.deleteOutputPath,
    metafile: !!options.metafile,
    includeInternal: true,
    thirdParty: !!options.thirdParty,
    assets,
    userDefinedBuildOptions,
    external: options.external ? [...options.external] : [...defaultExternal],
  }

  if (options.additionalEntryPoints && options.additionalEntryPoints.length > 0) {
    const { outputFileName, ...rest } = options
    if (outputFileName) {
      throw new Error(`Cannot use outputFileName and additionalEntry points together.`)
    }
    return {
      ...rest,
      ...partialOptions,
      singleEntry: false,
      // Use the `main` file name as the output file name.
      // NOTE: The .js default extension may be replaced later in getOutfile() call.
      outputFileName: `${path.parse(partialOptions.main).name}.js`,
    }
  } else {
    return {
      ...options,
      ...partialOptions,
      singleEntry: true,
      outputFileName:
        // NOTE: The .js default extension may be replaced later in getOutfile() call.
        options.outputFileName ?? `${path.parse(partialOptions.main).name}.js`,
    }
  }
}

export default async function* awsLambdaRuntimeExecutor(
  _options: LambdaRuntimeExecutorOptions,
  context: ExecutorContext,
) {
  process.env['NODE_ENV'] ??= context.configurationName ?? 'production'
  const projectGraph = context.projectGraph
  if (!projectGraph) throw new Error('projectGraph is undefined')
  const projectName = context.projectName
  if (!projectName) throw new Error('projectName is undefined')
  const projectConfig = context.projectsConfigurations?.projects?.[projectName]
  if (!projectConfig) throw new Error('can not resolve project configuration')
  const projectNode = projectGraph.nodes[projectName]
  if (!projectNode) throw new Error('projectNode is undefined')

  const options = normalizeOptions(_options, context)

  if (options.deleteOutputPath) removeSync(options.outputPath)

  const assetsResult = await copyAssets(options, context)

  if (!assetsResult.success) {
    throw new Error('Failed to copy assets')
  }

  const { resolved, excluded } = resolveDependencies(context, projectGraph, options)

  options.external = []
  for (const excludedDep of excluded) {
    options.external.push(getPackageName(excludedDep))
  }

  // Run type-checks first and bail if they don't pass.
  if (!options.skipTypeCheck) {
    const { errors } = await runTypeCheck(options, context)
    if (errors && errors.length > 0) {
      yield { success: false }
      return
    }
  }

  const buildResult = await build(options, context, resolved)

  if (options.generatePackageJson) {
    await generatePackageJson(context, options, excluded)
  }

  yield {
    success: buildResult.errors.length === 0,
  }
}

const generatePackageJson = async (
  context: ExecutorContext,
  options: NormalizedLambdaRuntimeExecutorOptions,
  externalDependencies: DependentBuildableProjectNode[],
) => {
  const cpjOptions: CopyPackageJsonOptions = {
    ...options,
    format: [options.format],
    skipTypings: true,
    generateLockfile: false,
    outputFileExtensionForCjs: getOutExtension({ ...options, format: 'cjs' }),
    updateBuildableProjectDepsInPackageJson: true,
  }

  // Any dependencies expect excluded external should already be bundeld or added to external node module
  cpjOptions.overrideDependencies = externalDependencies
  const externalDepsName = externalDependencies.reduce((acc, dep) => acc.add(getPackageName(dep)), new Set<string>())

  const packageJsonResult = await copyPackageJson(cpjOptions, context)
  const generatedPackageJson = readJsonFile(`${options.outputPath}/package.json`)
  ;(generatedPackageJson.dependencies = Object.keys(generatedPackageJson.dependencies || {})
    .filter((dep) => externalDepsName.has(dep))
    .reduce((acc, dep) => ({ ...acc, [dep]: generatedPackageJson.dependencies[dep] }), {})),
    writeJsonFile(`${options.outputPath}/package.json`, generatedPackageJson)
  if (!packageJsonResult.success) {
    throw new Error('Failed to generate package.json')
  }
}

const getTypeCheckOptions = (options: LambdaRuntimeExecutorOptions, context: ExecutorContext) => {
  const { tsConfig } = options

  const typeCheckOptions: TypeCheckOptions = {
    // TODO(jack): Add support for d.ts declaration files -- once the `@nx/js:tsc` changes are in we can use the same logic.
    mode: 'noEmit',
    tsConfigPath: tsConfig,
    // outDir: outputPath,
    workspaceRoot: context.root,
    rootDir: context.root,
  }

  return typeCheckOptions
}

const runTypeCheck = async (options: LambdaRuntimeExecutorOptions, context: ExecutorContext) => {
  const { errors, warnings } = await _runTypeCheck(getTypeCheckOptions(options, context))
  const hasErrors = errors && errors.length > 0
  const hasWarnings = warnings && warnings.length > 0

  if (hasErrors || hasWarnings) {
    await printDiagnostics(errors, warnings)
  }

  return { errors, warnings }
}
