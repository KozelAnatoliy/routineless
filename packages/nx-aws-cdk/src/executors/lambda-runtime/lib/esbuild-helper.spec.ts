import { ExecutorContext, workspaceRoot } from '@nx/devkit'
import { BuildResult, Metafile, build as esbuildBuild } from 'esbuild'
import { mkdir, writeFile, writeJson } from 'fs-extra'

import { getEntryPoints } from '../../../utils/esbuild'
import { mockExecutorContext } from '../../../utils/testing/executor'
import { mockProjectGraph } from '../../../utils/testing/project-graph'
import { NormalizedLambdaRuntimeExecutorOptions } from '../schema'
import { applyModifications, collectAllImports } from './ast'
import { build, getOutExtension } from './esbuild-helper'

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  workspaceRoot: 'workspace',
}))
jest.mock('../../../utils/esbuild', () => ({
  getEntryPoints: jest.fn(),
}))
jest.mock('esbuild', () => ({
  build: jest.fn(),
}))
jest.mock('fs-extra', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  writeJson: jest.fn(),
}))
jest.mock('./ast', () => ({
  ...jest.requireActual('./ast'),
  collectAllImports: jest.fn(),
  applyModifications: jest.fn(),
}))

const mockedGetEntryPoints = jest.mocked(getEntryPoints)
const mockedEsbuildBuild = jest.mocked(esbuildBuild)
const mockedMkdir = jest.mocked(mkdir)
const mockedWriteFile = jest.mocked(writeFile)
const mockedWriteJson = jest.mocked(writeJson)
const mockedCollectAllImports = jest.mocked(collectAllImports)
const mockedApplyModifications = jest.mocked(applyModifications)

describe('esbuild-helper', () => {
  const options: NormalizedLambdaRuntimeExecutorOptions = {
    bundle: true,
    platform: 'node',
    target: 'esnext',
    format: 'esm',
    main: 'apps/proj/src/index.ts',
    singleEntry: true,
    outputPath: 'dist/apps/proj',
    outputFileName: 'index.js',
    tsConfig: 'apps/proj/tsconfig.app.json',
    external: ['@aws-sdk/*'],
    userDefinedBuildOptions: {
      userOptions: true,
    },
    includeInternal: true,
    thirdParty: true,
    metafileInternal: false,
    assets: [],
  } as NormalizedLambdaRuntimeExecutorOptions

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getOutExtension', () => {
    it('should return .js if it is defined in userDefinedBuildOptions', () => {
      const result = getOutExtension({
        ...options,
        userDefinedBuildOptions: { outExtension: { '.js': '.js' } },
      })

      expect(result).toEqual('.js')
    })

    it('should return .mjs for esm format', () => {
      const result = getOutExtension(options)

      expect(result).toEqual('.mjs')
    })

    it('should return .cjs for cjs format', () => {
      const result = getOutExtension({ ...options, format: 'cjs' })

      expect(result).toEqual('.cjs')
    })

    it('should ignore conflicting user defined extension', () => {
      const result = getOutExtension({
        ...options,
        format: 'esm',
        userDefinedBuildOptions: { outExtension: { '.js': '.cjs' } },
      })

      expect(result).toEqual('.mjs')
    })
  })

  describe('build', () => {
    const context: ExecutorContext = mockExecutorContext('lambda-runtime')

    describe('bundle', () => {
      it('should build with default options', async () => {
        await build(options, context)

        expect(mockedEsbuildBuild).toHaveBeenCalledTimes(1)
        expect(mockedEsbuildBuild).toHaveBeenCalledWith({
          bundle: true,
          platform: 'node',
          target: 'esnext',
          format: 'esm',
          entryNames: '[dir]/[name]',
          entryPoints: ['apps/proj/src/index.ts'],
          outfile: 'dist/apps/proj/index.mjs',
          tsconfig: 'apps/proj/tsconfig.app.json',
          external: ['@aws-sdk/*'],
          outExtension: {
            '.js': '.mjs',
          },
          metafile: false,
          minify: false,
          sourcemap: false,
          userOptions: true,
          banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
        })
      })

      it('should propagate user defined build options', async () => {
        await build(
          {
            ...options,
            userDefinedBuildOptions: {
              userOptions: true,
              sourcemap: true,
              external: ['foo'],
            },
          } as NormalizedLambdaRuntimeExecutorOptions,
          context,
        )

        expect(mockedEsbuildBuild).toHaveBeenCalledWith(
          expect.objectContaining({
            sourcemap: true,
            external: ['foo', '@aws-sdk/*'],
            userOptions: true,
          }),
        )
      })

      it('should hash entry names if outputHashing enabled', async () => {
        await build(
          {
            ...options,
            outputHashing: 'all',
          },
          context,
        )

        expect(mockedEsbuildBuild).toHaveBeenCalledWith(
          expect.objectContaining({
            entryNames: '[dir]/[name].[hash]',
          }),
        )
      })

      it('should set sourcemap', async () => {
        await build(
          {
            ...options,
            sourcemap: true,
          },
          context,
        )

        expect(mockedEsbuildBuild).toHaveBeenCalledWith(
          expect.objectContaining({
            sourcemap: true,
          }),
        )
      })

      it('should supercede the base options sourcemap property compared to the one passed via the esbuildOptions', async () => {
        await build(
          {
            ...options,
            sourcemap: true,
            userDefinedBuildOptions: { sourcemap: false },
          },
          context,
        )

        expect(mockedEsbuildBuild).toHaveBeenCalledWith(
          expect.objectContaining({
            sourcemap: true,
          }),
        )
      })

      it('should support cjs format', async () => {
        await build(
          {
            ...options,
            format: 'cjs',
          },
          context,
        )

        expect(mockedEsbuildBuild).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'cjs',
            outExtension: {
              '.js': '.cjs',
            },
            banner: {},
          }),
        )
      })
    })

    describe('unbundled', () => {
      const { nodes: dependencies } = mockProjectGraph({
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
            i4: {},
            e1: {
              e2: {
                e3: {},
              },
              e4: {},
            },
          },
        },
      })
      beforeEach(() => {
        mockedGetEntryPoints.mockImplementation((nodeName) => [
          `${nodeName === 'proj' ? 'apps' : 'libs'}/${nodeName}/src/entry.ts`,
        ])
        mockedCollectAllImports.mockResolvedValue(
          new Map([
            [
              'external',
              {
                namespaceImport: true,
                defaultImport: true,
                sideEffectImport: true,
                namedImports: new Set(['namedImport']),
              },
            ],
            [
              '@some.module/name',
              {
                namespaceImport: false,
                defaultImport: true,
                sideEffectImport: false,
                namedImports: new Set(),
              },
            ],
            [
              'moment/min/moment-with-locales',
              { defaultImport: true, namespaceImport: false, sideEffectImport: true, namedImports: new Set() },
            ],
            [
              'moment/locale/ru',
              { defaultImport: false, namespaceImport: false, sideEffectImport: true, namedImports: new Set() },
            ],
          ]),
        )
      })

      it('should build unbundled', async () => {
        const metafileContent: Metafile = {
          inputs: {},
          outputs: {},
        }
        mockedEsbuildBuild.mockResolvedValueOnce({ metafile: metafileContent } as BuildResult)
        await build({ ...options, bundle: false, metafile: true }, context, dependencies)

        expect(mockedEsbuildBuild).toHaveBeenCalledTimes(2)
        // main app esbuild options
        expect(mockedEsbuildBuild).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            bundle: false,
            banner: {},
            outdir: 'dist/apps/proj',
            entryPoints: [
              { in: 'apps/proj/src/entry.ts', out: 'entry' },
              { in: 'libs/i3/src/entry.ts', out: 'node_modules/i3/entry' },
              { in: 'libs/i1/src/entry.ts', out: 'node_modules/i1/entry' },
              { in: 'libs/i2/src/entry.ts', out: 'node_modules/i2/entry' },
              { in: 'libs/i4/src/entry.ts', out: 'node_modules/i4/entry' },
            ],
          }),
        )
        //reexporting esbuild options
        expect(mockedEsbuildBuild).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            bundle: true,
            banner: {
              js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
            },
            outdir: 'dist/apps/proj/node_modules/external',
            entryPoints: [`${workspaceRoot}/tmp/proj/external/index.js`],
          }),
        )
        // 4 internal deps + 1 external reexporting
        expect(mockedWriteJson).toHaveBeenCalledTimes(6)
        //creates reexporting dir
        expect(mockedMkdir).toHaveBeenCalledWith(`${workspaceRoot}/tmp/proj/external`, { recursive: true })
        //creates reexporting file
        expect(mockedWriteFile).toHaveBeenCalledWith(
          `${workspaceRoot}/tmp/proj/external/index.js`,
          expect.stringContaining("export * as externalNamespace from 'external'"),
        )
        expect(mockedWriteFile).toHaveBeenCalledWith(
          `${workspaceRoot}/tmp/proj/external/index.js`,
          expect.stringContaining(
            "export { default as momentMinMomentWithLocalesDefault } from 'moment/min/moment-with-locales'",
          ),
        )
        expect(mockedWriteFile).toHaveBeenCalledWith(
          `${workspaceRoot}/tmp/proj/external/index.js`,
          expect.stringContaining("export { default as someModuleNameDefault } from '@some.module/name'"),
        )
        expect(mockedWriteFile).toHaveBeenCalledWith(
          `${workspaceRoot}/tmp/proj/external/index.js`,
          expect.stringContaining("import 'moment/locale/ru'"),
        )
        //generates reexporting package json
        expect(mockedWriteJson).toHaveBeenCalledWith('dist/apps/proj/node_modules/external/package.json', {
          main: 'index.js',
          name: 'external',
          type: 'module',
          version: '1.0.0',
        })
        // expect internal deps package json generation
        expect(mockedWriteJson).toHaveBeenCalledWith('dist/apps/proj/node_modules/i1/package.json', {
          main: 'index.mjs',
          name: 'i1',
          type: 'module',
          version: '1.0.0',
        })
        expect(mockedWriteJson).toHaveBeenCalledWith('dist/apps/proj/node_modules/i2/package.json', {
          main: 'index.mjs',
          name: 'i2',
          type: 'module',
          version: '1.0.0',
        })
        expect(mockedWriteJson).toHaveBeenCalledWith('dist/apps/proj/node_modules/i3/package.json', {
          main: 'index.mjs',
          name: 'i3',
          type: 'module',
          version: '1.0.0',
        })
        expect(mockedWriteJson).toHaveBeenCalledWith('dist/apps/proj/node_modules/i4/package.json', {
          main: 'index.mjs',
          name: 'i4',
          type: 'module',
          version: '1.0.0',
        })

        //expect metafile written
        expect(mockedWriteJson).toHaveBeenCalledWith('dist/apps/proj/meta.json', metafileContent)

        expect(mockedApplyModifications).toHaveBeenCalledTimes(1)
      })

      it('should not build dependencies if no external dependencies provided', async () => {
        const { nodes: internalOnly } = mockProjectGraph({
          nodesGraph: {
            i1: {},
            i2: {},
            i4: {},
          },
        })
        await build({ ...options, bundle: false }, context, internalOnly)

        expect(mockedApplyModifications).toHaveBeenCalledTimes(0)
      })

      it('should fail unbundled cjs format', async () => {
        await expect(build({ ...options, bundle: false, format: 'cjs' }, context)).rejects.toThrow(
          'Unbundled mode is only supported with esm format. Use bundle:true or format:esm.',
        )
      })
    })
  })
})
