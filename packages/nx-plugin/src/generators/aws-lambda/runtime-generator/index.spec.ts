import { Tree, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import awsLambdaRuntimeApplicationGenerator from '.'
import { AwsLambdaGeneratorSchema } from '../schema'

describe('awsLambdaRuntimeApplicationGenerator', () => {
  let tree: Tree
  const options: AwsLambdaGeneratorSchema = {
    directory: 'aws-lambda',
    name: 'runtime',
    unitTestRunner: 'jest',
    skipFormat: false,
  }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('should run successfully', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, options)

    expect(tree.exists('aws-lambda/runtime/jest.config.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/project.json')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/src/main.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/src/main.spec.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/src/app')).toBeFalsy()
  })

  it('should run successfully without unit test runner', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, { ...options, unitTestRunner: 'none' })

    expect(tree.exists('aws-lambda/runtime/src/main.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/src/main.spec.ts')).toBeFalsy()
    expect(tree.exists('aws-lambda/runtime/jest.config.ts')).toBeFalsy()
  })

  it('should update project configuration', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, options)

    const projectConfig = readProjectConfiguration(tree, 'aws-lambda-runtime')
    expect(projectConfig.targets?.['build']?.options.bundle).toBeTruthy()
  })
})
