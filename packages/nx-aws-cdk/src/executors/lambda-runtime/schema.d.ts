import { EsBuildExecutorOptions, NormalizedEsBuildExecutorOptions } from '@nx/esbuild/src/executors/esbuild/schema'

export interface LambdaRuntimeExecutorOptions extends Omit<EsBuildExecutorOptions, 'watch' | 'platform'> {
  format: 'cjs' | 'esm'
}

export interface NormalizedLambdaRuntimeExecutorOptions extends NormalizedEsBuildExecutorOptions {
  includeInternal: boolean
  thirdParty: boolean
  platform: 'node'
  target: 'esnext'
  format: 'cjs' | 'esm'
}
