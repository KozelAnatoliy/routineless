import type { ExecutorContext } from '@nx/devkit'
import { TypeCheckOptions, runTypeCheck as _runTypeCheck, printDiagnostics } from '@nx/js'
import * as esbuild from 'esbuild'
import { removeSync } from 'fs-extra'

import { buildEsbuildOptions } from './lib/build-esbuild-options'
import { CdkBuildExecutorOptions } from './schema'

export async function* cdkBuildExecutor(options: CdkBuildExecutorOptions, context: ExecutorContext) {
  if (options.deleteOutputPath) removeSync(options.outputPath)

  const { errors } = await runTypeCheck(options, context)
  if (errors && errors.length > 0) {
    yield { success: false }
    return
  }

  const esbuildOptions = buildEsbuildOptions(options, context)
  const buildResult = await esbuild.build(esbuildOptions)

  yield {
    success: buildResult.errors.length === 0,
  }
}

function getTypeCheckOptions(options: CdkBuildExecutorOptions, context: ExecutorContext) {
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

async function runTypeCheck(options: CdkBuildExecutorOptions, context: ExecutorContext) {
  const { errors, warnings } = await _runTypeCheck(getTypeCheckOptions(options, context))
  const hasErrors = errors && errors.length > 0
  const hasWarnings = warnings && warnings.length > 0

  if (hasErrors || hasWarnings) {
    await printDiagnostics(errors, warnings)
  }

  return { errors, warnings }
}

export default cdkBuildExecutor
