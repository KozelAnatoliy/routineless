import { ExecutorContext, ProjectGraphProjectNode, joinPathFragments, logger, workspaceRoot } from '@nx/devkit'
import { getEntryPoints } from '@nx/esbuild/src/utils/get-entry-points'
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils'
import * as esbuild from 'esbuild'
import { mkdir, writeFile, writeJson } from 'fs-extra'
import * as path from 'path'

import { NormalizedLambdaRuntimeExecutorOptions } from '../schema'
import {
  Imports,
  Modifications,
  applyModifications,
  collectAllImports,
  modificationFactory,
  resolveReexportingName,
} from './ast'
import { dependenciesReducer } from './dependencies'

const ESM_FILE_EXTENSION = '.mjs'
const CJS_FILE_EXTENSION = '.cjs'
const externalBundleName = 'external'

// workaround for esm bundling issue https://github.com/evanw/esbuild/pull/2067
const shimBanner = {
  js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
}

export const getOutExtension = (options: NormalizedLambdaRuntimeExecutorOptions): '.cjs' | '.mjs' | '.js' => {
  const userDefinedExt = options.userDefinedBuildOptions?.outExtension?.['.js']
  // Allow users to change the output extensions from default CJS and ESM extensions.
  // CJS -> .js
  // ESM -> .js
  return userDefinedExt === '.js' ? '.js' : options.format === 'esm' ? ESM_FILE_EXTENSION : CJS_FILE_EXTENSION
}

export const build = async (
  options: NormalizedLambdaRuntimeExecutorOptions,
  context: ExecutorContext,
  dependencies: DependentBuildableProjectNode[] = [],
): Promise<esbuild.BuildResult> => {
  if (!options.bundle) {
    if (options.format === 'esm') {
      logger.warn(
        `The project ${context.projectName} is using bundle:false with esm format. This feature is experimental, fallback to bundle:true if you encountered any problems building or deploying your code.`,
      )
    } else {
      throw new Error('Unbundled mode is only supported with esm format. Use bundle:true or format:esm.')
    }
  }
  const { internal, external } = dependencies.reduce(dependenciesReducer, {
    internal: [],
    external: [],
  })

  const mainAppEsbuildOptions = buildMainAppEsbuildOptions(options, context, internal)
  const buildResult = await esbuild.build(mainAppEsbuildOptions)

  if (!options.bundle) {
    if (external.length > 0) {
      const depBuildResult = await buildDependencies(options, context, mainAppEsbuildOptions, internal)
      await Promise.all([
        generateInternalPackageJson(options, mainAppEsbuildOptions, internal),
        applyGeneratedCodeModifications(options, depBuildResult.reexportingResult),
      ])
    } else {
      await generateInternalPackageJson(options, mainAppEsbuildOptions, internal)
    }
  }

  if (options.metafile) {
    const filename = 'meta.json'
    await writeJson(joinPathFragments(options.outputPath, filename), buildResult.metafile)
  }

  return buildResult
}

const buildBaseEsbuildOptions = (options: NormalizedLambdaRuntimeExecutorOptions): esbuild.BuildOptions => {
  const esbuildOptions: esbuild.BuildOptions = {
    ...options.userDefinedBuildOptions,
    entryNames: options.outputHashing === 'all' ? '[dir]/[name].[hash]' : '[dir]/[name]',
    bundle: !!options.bundle,
    // Cannot use external without bundle option
    external: options.bundle ? [...(options.userDefinedBuildOptions?.external ?? []), ...options.external] : [],
    minify: !!options.minify,
    platform: options.platform,
    target: options.target,
    metafile: !!options.metafile,
    tsconfig: options.tsConfig,
    sourcemap: (options.sourcemap ?? options.userDefinedBuildOptions?.sourcemap) || false,
    format: options.format,
  }

  return esbuildOptions
}

const buildMainAppEsbuildOptions = (
  options: NormalizedLambdaRuntimeExecutorOptions,
  context: ExecutorContext,
  internalDeps: DependentBuildableProjectNode[] = [],
): esbuild.BuildOptions => {
  const esbuildOptions = buildBaseEsbuildOptions(options)

  esbuildOptions.banner = options.bundle && options.format === 'esm' ? shimBanner : {}

  const outExtension = getOutExtension(options)
  esbuildOptions.outExtension = {
    '.js': outExtension,
  }

  if (!esbuildOptions.outfile && !esbuildOptions.outdir) {
    if (options.singleEntry && options.bundle && !esbuildOptions.splitting) {
      esbuildOptions.outfile = getOutfile(options)
    } else {
      esbuildOptions.outdir = options.outputPath
    }
  }

  const entryPoints = options.additionalEntryPoints ? [options.main, ...options.additionalEntryPoints] : [options.main]

  if (options.bundle) {
    esbuildOptions.entryPoints = entryPoints
  } else {
    const projectSourceRoot = context.projectsConfigurations!.projects[context.projectName!]!.sourceRoot!
    // gets all files used by initial entry points and defines them as entry points as well
    const mainAppEntryPoints = getEntryPoints(context.projectName!, context, {
      initialTsConfigFileName: options.tsConfig,
      recursive: false,
    }).map((entryPoint) => ({
      in: entryPoint,
      out: entryPoint.replace(`${projectSourceRoot}/`, '').replace(path.extname(entryPoint), ''),
    }))
    const internalProjectsEntryPoints = internalDeps
      .flatMap((dep) => getEntryPoints(dep.node.name, context).map((entryPoint) => ({ entryPoint, dep })))
      .map((depEntryPoint) => ({
        in: depEntryPoint.entryPoint,
        out: path.join(
          'node_modules',
          depEntryPoint.dep.name,
          depEntryPoint.entryPoint
            .replace((depEntryPoint.dep.node as ProjectGraphProjectNode).data.sourceRoot!, '')
            .replace(path.extname(depEntryPoint.entryPoint), ''),
        ),
      }))
    esbuildOptions.entryPoints = [...mainAppEntryPoints, ...internalProjectsEntryPoints]
  }

  return esbuildOptions
}

const buildDependencies = async (
  options: NormalizedLambdaRuntimeExecutorOptions,
  context: ExecutorContext,
  mainAppEsbuildOptions: esbuild.BuildOptions,
  internal: DependentBuildableProjectNode[],
): Promise<{ buildResult: esbuild.BuildResult; reexportingResult: ReexportingResult }> => {
  const esbuildOptions = buildBaseEsbuildOptions(options)
  esbuildOptions.bundle = true
  esbuildOptions.outdir = `${options.outputPath}/node_modules/${externalBundleName}`
  esbuildOptions.banner = options.format === 'esm' ? shimBanner : {}

  const reexportingResult = await generateReexportingEntryPoint(context, options, mainAppEsbuildOptions, internal)
  esbuildOptions.entryPoints = [reexportingResult.reexportingEntryPoint]

  const buildResult = await esbuild.build(esbuildOptions)
  await generatePackageJson(externalBundleName, 'index.js', { ...esbuildOptions, outdir: options.outputPath })
  return { buildResult, reexportingResult }
}

const generateInternalPackageJson = async (
  options: NormalizedLambdaRuntimeExecutorOptions,
  esbuildOptions: esbuild.BuildOptions,
  internal: DependentBuildableProjectNode[],
) => {
  const writePromises: Promise<void>[] = []
  for (const dep of internal) {
    writePromises.push(generatePackageJson(dep.name, `index${getOutExtension(options)}`, esbuildOptions))
  }

  return Promise.all(writePromises)
}

const applyGeneratedCodeModifications = async (
  options: NormalizedLambdaRuntimeExecutorOptions,
  reexportingResult: ReexportingResult,
) => {
  const modifications: Modifications =
    options.format === 'esm'
      ? {
          format: 'esm',
          importDeclaration: [
            modificationFactory.localImportsExtensionModification,
            modificationFactory.createImportSpecifiersModification({
              reexportedImports: reexportingResult.reexportedImports,
              reexportingModule: externalBundleName,
            }),
          ],
          exportAllDeclaration: [modificationFactory.localImportsExtensionModification],
          exportNamedDeclaration: [modificationFactory.localImportsExtensionModification],
        }
      : { format: 'cjs', callExpression: [modificationFactory.localRequireExtensionModification] }
  return applyModifications(options.outputPath, modifications, `**/node_modules/${externalBundleName}/**`)
}

const generatePackageJson = async (name: string, main: string, esbuildOptions: esbuild.BuildOptions) => {
  const packageJsonContent = {
    name: name,
    version: '1.0.0',
    type: esbuildOptions.format === 'esm' ? 'module' : 'commonjs',
    main: main,
  }

  return writeJson(joinPathFragments(esbuildOptions.outdir!, 'node_modules', name, 'package.json'), packageJsonContent)
}

type ReexportingResult = {
  reexportingEntryPoint: string
  reexportedImports: Map<string, Imports>
}

const generateReexportingEntryPoint = async (
  context: ExecutorContext,
  options: NormalizedLambdaRuntimeExecutorOptions,
  mainAppEsbuildOptions: esbuild.BuildOptions,
  internal: DependentBuildableProjectNode[],
): Promise<ReexportingResult> => {
  const mainAppEntryPoints = (mainAppEsbuildOptions.entryPoints as { in: string; out: string }[]).map(
    (entryPoint) => entryPoint.in,
  )
  const internalPackageNames = internal.map((dep) => dep.name)
  const collectedImports = await collectAllImports(mainAppEntryPoints, [
    '.',
    '.*',
    ...options.external,
    ...internalPackageNames,
  ])

  const tmpPath = path.join(workspaceRoot, 'tmp', context.projectName!, externalBundleName)
  const reexportingFile = path.join(tmpPath, `index.js`)
  await mkdir(tmpPath, { recursive: true })
  const reexportingFileContent = getReexportingFileContent(collectedImports)
  await writeFile(reexportingFile, reexportingFileContent)

  return { reexportingEntryPoint: reexportingFile, reexportedImports: collectedImports }
}

const getReexportingFileContent = (imports: Map<string, Imports>): string => {
  const exportStatements: string[] = []
  for (const [importModule, importsAggregate] of imports) {
    if (importsAggregate.namespaceImport) {
      exportStatements.push(
        `export * as ${resolveReexportingName(importModule, { namespace: true })} from '${importModule}'`,
      )
    }
    if (importsAggregate.namedImports.size || importsAggregate.defaultImport) {
      const namedImports = Array.from(importsAggregate.namedImports)
        .map((namedImport) => `${namedImport} as ${resolveReexportingName(importModule, { named: namedImport })}`)
        .join(', ')
      const defaultExport = importsAggregate.defaultImport
        ? `default as ${resolveReexportingName(importModule, { default: true })}`
        : ''
      const hasBoth = importsAggregate.namedImports.size && importsAggregate.defaultImport
      const namedExports = `${hasBoth ? ', ' : ''}${namedImports}`
      exportStatements.push(`export { ${defaultExport}${namedExports} } from '${importModule}'`)
    }
  }
  return exportStatements.join('\n')
}

const getOutfile = (options: NormalizedLambdaRuntimeExecutorOptions) => {
  const ext = getOutExtension(options)
  const candidate = joinPathFragments(options.outputPath, options.outputFileName!)
  const { dir, name } = path.parse(candidate)
  return `${dir}/${name}${ext}`
}
