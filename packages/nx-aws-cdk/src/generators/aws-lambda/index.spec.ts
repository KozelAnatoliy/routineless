import { Tree, readJson, readNxJson, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import generator from '.'
import { logger } from '../../utils/logger'
import { getRoutinelessConfig } from '../../utils/routineless'
import { AwsLambdaGeneratorSchema } from './schema'

jest.mock('../../utils/routineless')
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readNxJson: jest.fn(),
}))

const mockedGetRoutinelessConfig = jest.mocked(getRoutinelessConfig, { shallow: true })
const mockedReadNxJson = jest.mocked(readNxJson)
const actualReadNxJson = jest.requireActual('@nx/devkit').readNxJson

describe('aws-lambda generator', () => {
  let tree: Tree
  const options: AwsLambdaGeneratorSchema = {
    name: 'test-aws-lambda',
    addLambdaToInfraApp: false,
    unitTestRunner: 'jest',
  }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' })
    mockedGetRoutinelessConfig.mockReturnValue({ infraApp: 'infra' })
    mockedReadNxJson.mockImplementation(actualReadNxJson)
  })

  afterEach(() => jest.clearAllMocks())

  it('should run successfully with jest', async () => {
    await generator(tree, options)

    expect(tree.exists('apps/test-aws-lambda/jest.config.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/project.json')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/runtime/main.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/runtime/main.spec.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/infra/index.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/infra/index.spec.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/lib')).toBeFalsy()

    const jestConfigContent = tree.read('apps/test-aws-lambda/jest.config.ts')?.toString()
    expect(jestConfigContent).toContain("collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts', '!src/index.ts'],")
  })

  it('should run successfully with directory provided', async () => {
    await generator(tree, { ...options, directory: 'lambdas' })

    expect(tree.exists('apps/lambdas/test-aws-lambda/jest.config.ts')).toBeTruthy()
    expect(tree.exists('apps/lambdas/test-aws-lambda/project.json')).toBeTruthy()
    expect(tree.exists('apps/lambdas/test-aws-lambda/src/runtime/main.ts')).toBeTruthy()
    expect(tree.exists('apps/lambdas/test-aws-lambda/src/runtime/main.spec.ts')).toBeTruthy()
    expect(tree.exists('apps/lambdas/test-aws-lambda/src/infra/index.ts')).toBeTruthy()
    expect(tree.exists('apps/lambdas/test-aws-lambda/src/infra/index.spec.ts')).toBeTruthy()
  })

  it('should run successfully without unit test runner', async () => {
    await generator(tree, { ...options, unitTestRunner: 'none' })

    expect(tree.exists('apps/test-aws-lambda/project.json')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/infra/index.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/infra/index.spec.ts')).toBeFalsy()
    expect(tree.exists('apps/test-aws-lambda/src/runtime/main.ts')).toBeTruthy()
    expect(tree.exists('apps/test-aws-lambda/src/runtime/main.spec.ts')).toBeFalsy()
    expect(tree.exists('apps/test-aws-lambda/jest.config.ts')).toBeFalsy()
  })

  it('should update project configuration', async () => {
    await generator(tree, options)

    const projectConfig = readProjectConfiguration(tree, 'test-aws-lambda')
    expect(projectConfig.targets?.['build']?.dependsOn).toEqual(['build-runtime'])
    expect(projectConfig.targets?.['build-runtime']).toEqual({
      executor: '@nx/esbuild:esbuild',
      outputs: ['{options.outputPath}'],
      defaultConfiguration: 'development',
      options: {
        platform: 'node',
        outputPath: `dist/lambdas-runtime/${options.name}`,
        format: ['cjs'],
        bundle: true,
        main: `apps/${options.name}/src/runtime/main.ts`,
        tsConfig: `apps/${options.name}/tsconfig.lib.json`,
        thirdParty: true,
        external: ['@aws-sdk/*'],
        assets: ['src/assets'],
        esbuildOptions: {
          sourcemap: true,
          outExtension: {
            '.js': '.js',
          },
        },
      },
      configurations: {
        development: {},
        production: {
          minify: true,
          esbuildOptions: {
            sourcemap: false,
            outExtension: {
              '.js': '.js',
            },
          },
        },
      },
    })
  })

  it('should add dependencies', async () => {
    await generator(tree, options)

    const packageJson = readJson(tree, 'package.json')

    expect(packageJson.dependencies['@routineless/cdk']).toBeDefined()
    expect(packageJson.devDependencies['@types/aws-lambda']).toBeDefined()
  })

  it('should not add lambda to infra app if routineless config is not defined', async () => {
    mockedGetRoutinelessConfig.mockReturnValue(undefined)
    jest.spyOn(logger, 'warn')
    await generator(tree, { ...options, addLambdaToInfraApp: true })

    expect(logger.warn).toHaveBeenCalledWith(
      "Could not find infra app name at .routineless.json config. Can't add stack to infra app",
    )
  })

  it('should logg error if lambda can not be added without infra project', async () => {
    jest.spyOn(logger, 'error')
    await generator(tree, { ...options, addLambdaToInfraApp: true })

    expect(logger.error).toHaveBeenCalledWith('Could not find infra app')
  })

  it('should fail if read nx json failed', async () => {
    mockedReadNxJson.mockReturnValue(null)

    await expect(generator(tree, options)).rejects.toThrow(new Error('Failed to read nx.json'))
  })

  it('should update nx json with build-runtime defaults', async () => {
    await generator(tree, options)
    const resultNxJson = actualReadNxJson(tree)

    expect(resultNxJson.targetDefaults['build-runtime']).toEqual({
      cache: true,
      dependsOn: ['^build'],
      inputs: ['production', '^production'],
    })
  })

  it('should not update nx json if build-runtime already presented', async () => {
    mockedReadNxJson.mockImplementationOnce((tree) => {
      const nxJson = actualReadNxJson(tree)
      nxJson.targetDefaults = { ...(nxJson.targetDefaults || {}), 'build-runtime': {} }
      return nxJson
    })

    await generator(tree, options)
    const resultNxJson = actualReadNxJson(tree)

    expect(resultNxJson.targetDefaults['build-runtime']).toBeUndefined()
  })
})
