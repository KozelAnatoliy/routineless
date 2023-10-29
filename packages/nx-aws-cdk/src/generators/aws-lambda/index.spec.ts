import { Tree, logger, readJson, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import generator from '.'
import { getRoutinelessConfig } from '../../utils/routineless'
import { AwsLambdaGeneratorSchema } from './schema'

jest.mock('../../utils/routineless')

const mockedGetRoutinelessConfig = jest.mocked(getRoutinelessConfig, { shallow: true })

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
    expect(projectConfig.targets?.['build']?.options.bundle).toBeTruthy()
  })

  it('should add dependencies', async () => {
    await generator(tree, options)

    const packageJson = readJson(tree, 'package.json')

    expect(packageJson.dependencies['@routineless/cdk']).toEqual('latest')
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
})
