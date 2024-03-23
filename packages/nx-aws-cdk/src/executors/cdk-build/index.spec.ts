import { ExecutorContext } from '@nx/devkit'
import { printDiagnostics, runTypeCheck } from '@nx/js'
import { BuildResult, build } from 'esbuild'
import { removeSync } from 'fs-extra'

import { mockExecutorContext } from '../../utils/testing/executor'
import { cdkBuildExecutor } from './index'
import { buildEsbuildOptions } from './lib/build-esbuild-options'
import { CdkBuildExecutorOptions } from './schema'

jest.mock('@nx/js', () => ({
  ...jest.requireActual('@nx/js'),
  printDiagnostics: jest.fn(),
  runTypeCheck: jest.fn(),
}))
jest.mock('esbuild', () => ({
  build: jest.fn(),
}))
jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  removeSync: jest.fn(),
}))
jest.mock('./lib/build-esbuild-options', () => ({
  buildEsbuildOptions: jest.fn(),
}))

const mockedPrintDiagnostics = jest.mocked(printDiagnostics)
const mockedRunTypeCheck = jest.mocked(runTypeCheck)
const mockedEsbuildBuild = jest.mocked(build)
const mockedRemoveSync = jest.mocked(removeSync)
const mockedBuildEsbuildOptions = jest.mocked(buildEsbuildOptions)

describe('cdkBuildExecutor', () => {
  const options: CdkBuildExecutorOptions = {
    main: 'apps/cdk/src/main.ts',
    outputPath: 'dist/apps/cdk',
    tsConfig: 'apps/cdk/tsconfig.app.json',
  }
  const context: ExecutorContext = mockExecutorContext('cdk')
  const mockTypeCheckResult = {
    warnings: [],
    errors: [],
    inputFilesCount: 1,
    totalFilesCount: 1,
    incremental: false,
  }
  const mockEsbuildOptions = {
    entryPoints: [options.main],
    outdir: options.outputPath,
    bundle: true,
  }

  beforeEach(() => {
    mockedRunTypeCheck.mockResolvedValue(mockTypeCheckResult)
    mockedBuildEsbuildOptions.mockReturnValue(mockEsbuildOptions)
    mockedEsbuildBuild.mockResolvedValue({ errors: [] } as never as BuildResult)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should build successfully', async () => {
    await expectExecutorSuccess(options, context)

    expect(mockedRemoveSync).not.toHaveBeenCalled()
    expect(mockedRunTypeCheck).toHaveBeenCalled()
    expect(mockedEsbuildBuild).toHaveBeenCalledWith(mockEsbuildOptions)
  })

  it('should delete output path before building', async () => {
    await expectExecutorSuccess({ ...options, deleteOutputPath: true }, context)

    expect(mockedRemoveSync).toHaveBeenCalledWith(options.outputPath)
  })

  it('should fail if type check failed', async () => {
    const typeCheckErrors = ['type check error']
    mockedRunTypeCheck.mockResolvedValueOnce({ ...mockTypeCheckResult, errors: typeCheckErrors })

    await expectExecutorError(options, context)
    expect(mockedPrintDiagnostics).toHaveBeenCalledWith(typeCheckErrors, [])
  })

  it('should fail if esbuild build failed', async () => {
    const buildErrors = ['esbuild error']
    mockedEsbuildBuild.mockResolvedValueOnce({ errors: buildErrors } as never as BuildResult)

    await expectExecutorError(options, context)
  })
})

const expectExecutorSuccess = async (options: CdkBuildExecutorOptions, context: ExecutorContext) => {
  const output = await cdkBuildExecutor(options, context)
  for await (const res of output) {
    expect(res.success).toBe(true)
  }
}

const expectExecutorError = async (
  options: CdkBuildExecutorOptions,
  context: ExecutorContext,
  errorMessage?: string,
) => {
  let expectedError
  try {
    let finalResult = true
    for await (const res of cdkBuildExecutor(options, context)) {
      finalResult = finalResult && res.success
    }
    expect(finalResult).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    expectedError = e
    if (e.matcherResult) {
      throw e
    }
  }
  if (errorMessage) expect(expectedError).toEqual(new Error(errorMessage))
}
