import { ExecutorContext } from '@nx/devkit'
import { mkdirSync, writeFileSync } from 'fs'

import { getEntryPoints } from '../../../utils/esbuild'
import { mockExecutorContext } from '../../../utils/testing/executor'
import { getTsConfigCompilerPaths } from '../../../utils/workspace'
import { CdkBuildExecutorOptions } from '../schema'
import { buildEsbuildOptions } from './build-esbuild-options'

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}))
jest.mock('../../../utils/esbuild', () => ({
  getEntryPoints: jest.fn(),
}))
jest.mock('../../../utils/workspace', () => ({
  getTsConfigCompilerPaths: jest.fn(),
}))

const mockedMkdirSync = jest.mocked(mkdirSync)
const mockedWriteFileSync = jest.mocked(writeFileSync)
const mockedGetEntryPoints = jest.mocked(getEntryPoints)
const mockedGetTsConfigCompilerPaths = jest.mocked(getTsConfigCompilerPaths)

describe('buildEsbuildOptions', () => {
  const options: CdkBuildExecutorOptions = {
    main: 'apps/cdk/src/main.ts',
    outputPath: 'dist/apps/cdk',
    tsConfig: 'apps/cdk/tsconfig.app.json',
  }
  const context: ExecutorContext = mockExecutorContext('cdk')

  beforeEach(() => {
    mockedGetTsConfigCompilerPaths.mockReturnValue({
      '@testproj/lambda1-infra': ['apps/lambda1/infra/src/index.ts'],
      '@testproj/lambda2-infra': ['apps/lambda2/infra/src/index.ts'],
      '@testproj/utils': ['libs/utils/src/index.ts'],
    })
    mockedGetEntryPoints.mockReturnValue([
      'apps/lambda1/infra/src/index.ts',
      'apps/lambda1/infra/src/lib.ts',
      'apps/lambda2/infra/src/index.ts',
      'apps/lambda2/infra/src/lib.ts',
      'libs/utils/src/index.ts',
    ])
  })

  it('should return esbuild options', () => {
    const result = buildEsbuildOptions(options, context)

    expect(mockedMkdirSync).toHaveBeenCalledWith('/root/tmp/proj', { recursive: true })
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      '/root/tmp/proj/main-with-require-overrides.js',
      expect.any(String),
    )
    expect(mockedWriteFileSync.mock.calls![0]![1]).toContain("require('./apps/cdk/src/main.js');")
    expect(mockedWriteFileSync.mock.calls![0]![1]).toContain(
      'const manifest = [{"module":"@testproj/lambda1-infra","pattern":"apps/lambda1/infra/src/index.ts",' +
        '"exactMatch":"apps/lambda1/infra/src/index.js"},{"module":"@testproj/lambda2-infra","pattern":"apps/lambda2/infra/src/index.ts",' +
        '"exactMatch":"apps/lambda2/infra/src/index.js"},{"module":"@testproj/utils","pattern":"libs/utils/src/index.ts",' +
        '"exactMatch":"libs/utils/src/index.js"}];',
    )

    expect(result).toEqual({
      entryNames: '[dir]/[name]',
      bundle: false,
      platform: 'node',
      target: 'esnext',
      tsconfig: options.tsConfig,
      format: 'cjs',
      outExtension: {
        '.js': '.js',
      },
      outdir: options.outputPath,
      entryPoints: [
        {
          in: '/root/tmp/proj/main-with-require-overrides.js',
          out: 'main',
        },
        {
          in: 'apps/lambda1/infra/src/index.ts',
          out: 'apps/lambda1/infra/src/index',
        },
        {
          in: 'apps/lambda1/infra/src/lib.ts',
          out: 'apps/lambda1/infra/src/lib',
        },
        {
          in: 'apps/lambda2/infra/src/index.ts',
          out: 'apps/lambda2/infra/src/index',
        },
        {
          in: 'apps/lambda2/infra/src/lib.ts',
          out: 'apps/lambda2/infra/src/lib',
        },
        {
          in: 'libs/utils/src/index.ts',
          out: 'libs/utils/src/index',
        },
      ],
    })
  })

  it('shoudl throw if main file conflicting generated entry point', () => {
    expect(() => buildEsbuildOptions({ ...options, main: 'main.ts' }, context)).toThrow(
      new Error(
        `There is a conflict between Nx-generated main file and the project's main file. Main file should be under src/ folder.`,
      ),
    )
  })
})
