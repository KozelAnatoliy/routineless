import { Tree, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import awsLambdaRuntimeApplicationGenerator from '.'
import { ProjectProperties } from '../../../utils/generators'
import { AwsLambdaGeneratorSchema } from '../schema'

describe('awsLambdaRuntimeApplicationGenerator', () => {
  let tree: Tree
  const options: AwsLambdaGeneratorSchema & ProjectProperties = {
    projectRoot: 'apps/aws-lambda',
    name: 'aws-lambda',
    unitTestRunner: 'jest',
    skipFormat: false,
  } as AwsLambdaGeneratorSchema & ProjectProperties

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('should run successfully', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, options)

    expect(tree.exists('apps/aws-lambda/runtime/jest.config.ts')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/runtime/project.json')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/runtime/src/main.ts')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/runtime/src/main.spec.ts')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/runtime/src/app')).toBeFalsy()
  })

  it('should run successfully without unit test runner', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, { ...options, unitTestRunner: 'none' })

    expect(tree.exists('apps/aws-lambda/runtime/src/main.ts')).toBeTruthy()
    expect(tree.exists('apps/aws-lambda/runtime/src/main.spec.ts')).toBeFalsy()
    expect(tree.exists('apps/aws-lambda/runtime/jest.config.ts')).toBeFalsy()
  })

  it('should remove generated targets from project configuration', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, options)

    const projectConfig = readProjectConfiguration(tree, 'aws-lambda-runtime')
    expect(projectConfig.targets?.['build']).toBeUndefined()
    expect(projectConfig.targets?.['serve']).toBeUndefined()
  })
})
