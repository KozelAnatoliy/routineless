import { ExecutorContext, readJsonFile, writeJsonFile } from '@nx/devkit'
import { copyAssets, copyPackageJson, printDiagnostics, runTypeCheck } from '@nx/js'
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils'
import { BuildResult } from 'esbuild'
import { existsSync, removeSync } from 'fs-extra'
import path from 'path'

import { mockExecutorContext } from '../../utils/testing/executor'
import { mockProjectGraph } from '../../utils/testing/project-graph'
import executor from './executor'
import { build } from './lib/esbuild-helper'
import { LambdaRuntimeExecutorOptions } from './schema'

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readJsonFile: jest.fn(),
  writeJsonFile: jest.fn(),
}))
jest.mock('@nx/js', () => ({
  ...jest.requireActual('@nx/js'),
  copyAssets: jest.fn(),
  copyPackageJson: jest.fn(),
  printDiagnostics: jest.fn(),
  runTypeCheck: jest.fn(),
}))
jest.mock('./lib/esbuild-helper', () => ({
  ...jest.requireActual('./lib/esbuild-helper'),
  build: jest.fn(),
}))
jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  existsSync: jest.fn(),
  removeSync: jest.fn(),
}))
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn(),
}))

const mockedReadJsonFile = jest.mocked(readJsonFile)
const mockedWriteJsonFile = jest.mocked(writeJsonFile)
const mockedCopyAssets = jest.mocked(copyAssets)
const mockedCopyPackageJson = jest.mocked(copyPackageJson)
const mockedPrintDiagnostics = jest.mocked(printDiagnostics)
const mockedRunTypeCheck = jest.mocked(runTypeCheck)
const mockedEsbuildBuild = jest.mocked(build)
const mockedRemoveSync = jest.mocked(removeSync)
const mockedPathResolve = jest.mocked(path.resolve)
const mockedExistsSync = jest.mocked(existsSync)

describe('LambdaRuntime Executor', () => {
  let context: ExecutorContext
  const options: LambdaRuntimeExecutorOptions = {
    tsConfig: 'apps/proj/tsconfig.json',
    outputPath: 'dist/apps/proj',
    bundle: true,
    format: 'esm',
    outputHashing: 'none',
    metafile: false,
    minify: false,
    target: 'esnext',
    skipTypeCheck: false,
    generatePackageJson: false,
    thirdParty: true,
    includeInternal: true,
    deleteOutputPath: true,
    additionalEntryPoints: [],
    assets: [],
  } as never as LambdaRuntimeExecutorOptions
  const mockTypeCheckResult = {
    warnings: [],
    errors: [],
    inputFilesCount: 1,
    totalFilesCount: 1,
    incremental: false,
  }

  beforeEach(() => {
    mockedCopyAssets.mockResolvedValue({ success: true })
    mockedCopyPackageJson.mockResolvedValue({ success: true })
    mockedReadJsonFile.mockReturnValue({
      dependencies: {
        'proj/i1': '0.0.1',
        e1: '1.0.0',
      },
    })
    mockedRunTypeCheck.mockResolvedValue(mockTypeCheckResult)
    mockedEsbuildBuild.mockResolvedValue({ errors: [] } as never as BuildResult)
    context = mockExecutorContext('lambda-runtime', {
      mockProjectGraphOptions: {
        nodesGraph: {
          proj: {
            i1: {
              i3: {
                e4: {},
              },
              e5: {},
            },
            i2: {
              e6: {},
            },
            e1: {
              e2: {
                e3: {},
              },
              e4: {},
            },
          },
        },
      },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('normalizeOptions', () => {
    it('should normalize options', async () => {
      await expectExecutorSuccess(options, context)

      expect(mockedRemoveSync).toHaveBeenCalledWith('dist/apps/proj')
      expect(mockedEsbuildBuild).toHaveBeenCalledWith(
        {
          ...options,
          assets: ['apps/proj/package.json'],
          deleteOutputPath: true,
          external: [],
          main: '/root/apps/proj/src/main.ts',
          metafile: false,
          outputFileName: 'main.js',
          platform: 'node',
          singleEntry: true,
          userDefinedBuildOptions: {},
        },
        context,
        expect.anything(),
      )
      expect(mockedCopyAssets).toHaveBeenCalledWith(
        expect.objectContaining({ assets: ['apps/proj/package.json'] }),
        context,
      )
    })

    it('should not include package.json to assets if generatePackageJson is true', async () => {
      await expectExecutorSuccess({ ...options, generatePackageJson: true }, context)

      expect(mockedCopyAssets).toHaveBeenCalledWith(expect.objectContaining({ assets: [] }), context)
    })

    it('should propagate user defined esbuild options', async () => {
      await expectExecutorSuccess({ ...options, esbuildOptions: { sourcemap: true } }, context)

      expect(mockedEsbuildBuild).toHaveBeenCalledWith(
        expect.objectContaining({ userDefinedBuildOptions: { sourcemap: true } }),
        context,
        expect.anything(),
      )
    })

    it('should use provided esbuild config path', async () => {
      mockedPathResolve.mockReturnValueOnce(path.join(__dirname, 'fixtures', 'esbuild.config.json'))
      mockedExistsSync.mockReturnValue(true)

      await expectExecutorSuccess({ ...options, esbuildConfig: 'esbuild.config.ts' }, context)

      expect(mockedEsbuildBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          userDefinedBuildOptions: {
            bundle: true,
            platform: 'node',
            outfile: 'build/main.js',
            sourcemap: true,
          },
        }),
        context,
        expect.anything(),
      )
    })

    it('should support additional entry points', async () => {
      await expectExecutorSuccess({ ...options, additionalEntryPoints: ['/root/additional'] }, context)

      expect(mockedEsbuildBuild).toHaveBeenCalledWith(
        expect.objectContaining({ singleEntry: false, outputFileName: 'main.js' }),
        context,
        expect.anything(),
      )
    })

    it('should fail if outputFileName provided with additionalEntryPoints', async () => {
      await expectExecutorError(
        { ...options, additionalEntryPoints: ['/root/additional'], outputFileName: 'main.js' },
        context,
        'Cannot use outputFileName and additionalEntry points together.',
      )
    })

    it('should fail if esbuild config and options are provided', async () => {
      await expectExecutorError(
        { ...options, esbuildConfig: 'esbuild.config.ts', esbuildOptions: {} },
        context,
        'Cannot use both esbuildOptions and esbuildConfig options.',
      )
    })

    it('should fail if cannot resolve provided esbuild config', async () => {
      const esbuildConfigPath = '/unresolvable'
      mockedExistsSync.mockReturnValue(false)
      mockedPathResolve.mockReturnValueOnce('/unresolvable')

      await expectExecutorError(
        { ...options, esbuildConfig: 'esbuild.config.ts' },
        context,
        `Path of esbuildConfig does not exist: ${esbuildConfigPath}`,
      )
    })
  })

  describe('thirdPartyDependencies', () => {
    it('should exclude third party dependencies', async () => {
      await expectExecutorSuccess({ ...options, thirdParty: false, deleteOutputPath: false }, context)

      expect(mockedRemoveSync).not.toHaveBeenCalled()
      expectDependencies(['e1', 'e4', 'e5', 'e6'], context)
    })

    it('should exclude external dependencies provided through options', async () => {
      const userProvidedExternal = ['e2', 'e4']
      await expectExecutorSuccess({ ...options, external: userProvidedExternal }, context)

      expectDependencies([...userProvidedExternal], context)
    })
  })

  describe('generatePackageJson', () => {
    it('should generate package.json', async () => {
      await expectExecutorSuccess({ ...options, generatePackageJson: true }, context)

      expect(mockedCopyPackageJson).toHaveBeenCalledWith(
        expect.objectContaining({
          format: ['esm'],
          skipTypings: true,
          generateLockfile: false,
          outputFileExtensionForCjs: '.cjs',
          updateBuildableProjectDepsInPackageJson: true,
          overrideDependencies: [],
        }),
        context,
      )
      expect(mockedWriteJsonFile).toHaveBeenCalledWith('dist/apps/proj/package.json', { dependencies: {} })
    })

    it('should not generate package.json if generatePackageJson is false', async () => {
      await expectExecutorSuccess(options, context)

      expect(mockedCopyPackageJson).not.toHaveBeenCalled()
    })

    it('should generate package.json with excluded dependency added', async () => {
      mockedReadJsonFile.mockReturnValue({ dependencies: { 'proj/i1': '0.0.1', e4: '1.0.0' } })
      await expectExecutorSuccess({ ...options, generatePackageJson: true, external: ['e4'] }, context)

      const expectedDependencies = mockProjectGraph({ nodesGraph: { e4: {} } }).nodes
      expectPackageJsonDependencies(expectedDependencies)
      expect(mockedWriteJsonFile).toHaveBeenCalledWith('dist/apps/proj/package.json', { dependencies: { e4: '1.0.0' } })
    })

    describe('bundle: false', () => {
      beforeEach(() => {
        mockedExistsSync.mockReturnValue(true as never)
      })

      it('should generate package.json', async () => {
        await expectExecutorSuccess({ ...options, generatePackageJson: true, bundle: false }, context)

        expect(mockedCopyPackageJson).toHaveBeenCalledWith(
          expect.objectContaining({
            format: ['esm'],
            skipTypings: true,
            generateLockfile: false,
            outputFileExtensionForCjs: '.cjs',
            updateBuildableProjectDepsInPackageJson: true,
            overrideDependencies: [],
          }),
          context,
        )
        expect(mockedWriteJsonFile).toHaveBeenCalledWith('dist/apps/proj/package.json', { dependencies: {} })
      })

      it('should generate package.json with extra dependency from external', async () => {
        mockedReadJsonFile.mockReturnValue({ dependencies: { 'proj/i1': '0.0.1', e4: '1.0.0' } })
        await expectExecutorSuccess({ ...options, generatePackageJson: true, bundle: false, external: ['e4'] }, context)

        const expectedDependencies = mockProjectGraph({ nodesGraph: { e4: {} } }).nodes
        expectPackageJsonDependencies(expectedDependencies)
        expect(mockedWriteJsonFile).toHaveBeenCalledWith('dist/apps/proj/package.json', {
          dependencies: { e4: '1.0.0' },
        })
      })
    })
  })

  describe('errors', () => {
    it('should fail if projectConfig is not defined', async () => {
      delete context.projectsConfigurations

      await expectExecutorError(options, context, 'can not resolve project configuration')
    })

    it('should fail if projectGraph is not defined', async () => {
      delete context.projectGraph

      await expectExecutorError(options, context, 'projectGraph is undefined')
    })

    it('should fail if projectName is not defined', async () => {
      delete context.projectName
      await expectExecutorError(options, context, 'projectName is undefined')
    })

    it('should fail if projectNode is not defined', async () => {
      delete context.projectGraph?.nodes[context.projectName!]
      await expectExecutorError(options, context, 'projectNode is undefined')
    })

    it('should fail if assets copy failed', async () => {
      mockedCopyAssets.mockResolvedValueOnce({ success: false })
      await expectExecutorError(options, context, 'Failed to copy assets')
    })

    it('should fail if type check failed', async () => {
      const typeCheckErrors = ['type check error']
      mockedRunTypeCheck.mockResolvedValueOnce({ ...mockTypeCheckResult, errors: typeCheckErrors })
      await expectExecutorError(options, context)
      expect(mockedPrintDiagnostics).toHaveBeenCalledWith(typeCheckErrors, [])
    })

    it('should fail if esbuild build failed', async () => {
      mockedEsbuildBuild.mockResolvedValueOnce({ errors: ['esbuild error'] } as never as BuildResult)
      await expectExecutorError(options, context)
    })

    it('should fail on copy package json failure', async () => {
      mockedCopyPackageJson.mockResolvedValueOnce({ success: false })
      await expectExecutorError({ ...options, generatePackageJson: true }, context, 'Failed to generate package.json')
    })
  })
})

const expectExecutorSuccess = async (options: LambdaRuntimeExecutorOptions, context: ExecutorContext) => {
  const output = await executor(options, context)
  for await (const res of output) {
    expect(res.success).toBe(true)
  }
}

const expectExecutorError = async (
  options: LambdaRuntimeExecutorOptions,
  context: ExecutorContext,
  errorMessage?: string,
) => {
  let expectedError
  try {
    let finalResult = true
    for await (const res of executor(options, context)) {
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

const expectDependencies = (expectedDependencies: string[], context: ExecutorContext) => {
  expect(mockedEsbuildBuild).toHaveBeenCalledWith(
    expect.objectContaining({ external: expect.arrayContaining(expectedDependencies) }),
    context,
    expect.anything(),
  )
  expect(mockedEsbuildBuild.mock.calls![0]![0].external.length).toEqual(expectedDependencies.length)
}

const expectPackageJsonDependencies = (expectedDependencies: DependentBuildableProjectNode[], override = true) => {
  expect(mockedCopyPackageJson).toHaveBeenCalled()

  const resolvedDependencies = (
    override
      ? mockedCopyPackageJson.mock.calls![0]![0].overrideDependencies
      : mockedCopyPackageJson.mock.calls![0]![0].extraDependencies
  ) as DependentBuildableProjectNode[]
  const resolvedDepsSet = resolvedDependencies?.reduce((acc: Set<string>, dep: DependentBuildableProjectNode) => {
    acc.add(dep.name)
    return acc
  }, new Set())
  for (const expectedNode of expectedDependencies) {
    expect(resolvedDepsSet.has(expectedNode.name)).toBeTruthy()
  }
  expect(resolvedDependencies?.length).toEqual(expectedDependencies.length)
}
