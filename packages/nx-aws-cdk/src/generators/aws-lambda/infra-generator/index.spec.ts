import { Tree, logger, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import awsLambdaInfraLibraryGenerator from '.'
import { ProjectProperties } from '../../../utils/generators'
import { getRoutinelessConfig } from '../../../utils/routineless'
import { AwsLambdaGeneratorSchema } from '../schema'

jest.mock('../../../utils/routineless')

const mockedGetRoutinelessConfig = jest.mocked(getRoutinelessConfig, { shallow: true })

describe('awsLambdaInfraLibraryGenerator', () => {
  let tree: Tree
  const options: AwsLambdaGeneratorSchema & ProjectProperties = {
    unitTestRunner: 'jest',
    skipFormat: false,
    projectRoot: 'apps/aws-lambda',
    name: 'aws-lambda',
    addLambdaToInfraApp: false,
  } as AwsLambdaGeneratorSchema & ProjectProperties

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' })
    mockedGetRoutinelessConfig.mockReturnValue({ infraApp: 'infra' })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should run successfully', async () => {
    await awsLambdaInfraLibraryGenerator(tree, { ...options, unitTestRunner: 'none' })

    expect(tree.exists('apps/aws-lambda/infra/project.json')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/infra/src/index.ts')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/infra/src/lib')).toBeFalsy()
    expect(tree.exists('apps/aws-lambda/infra/src/index.spec.ts')).toBeFalsy()
    expect(tree.exists('apps/aws-lambda/infra/jest.config.ts')).toBeFalsy()
  })

  it('should run successfully with jest', async () => {
    await awsLambdaInfraLibraryGenerator(tree, options)

    expect(tree.exists('apps/aws-lambda/infra/src/index.spec.ts')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/infra/jest.config.ts')).toBeTruthy()
  })

  it('should update project configuration', async () => {
    await awsLambdaInfraLibraryGenerator(tree, options)

    const projectConfig = readProjectConfiguration(tree, 'aws-lambda-infra')
    expect(projectConfig.implicitDependencies).toEqual(['aws-lambda-runtime'])
  })

  it('should not add lambda to infra app if routineless config is not defined', async () => {
    mockedGetRoutinelessConfig.mockReturnValue({})
    jest.spyOn(logger, 'warn')
    await awsLambdaInfraLibraryGenerator(tree, { ...options, addLambdaToInfraApp: true })

    expect(logger.warn).toHaveBeenCalledWith(
      "Could not find infra app name at .routineless.json config. Can't add stack to infra app",
    )
  })

  it('should logg error if lambda can not be added without infra project', async () => {
    jest.spyOn(logger, 'error')
    await awsLambdaInfraLibraryGenerator(tree, { ...options, addLambdaToInfraApp: true })

    expect(logger.error).toHaveBeenCalledWith('Could not find infra app')
  })
})
