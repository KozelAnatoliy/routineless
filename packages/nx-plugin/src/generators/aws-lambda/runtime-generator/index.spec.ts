import { Tree } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

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

    expect(tree.exists('aws-lambda/runtime/src/index.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/src/index.spec.ts')).toBeTruthy()
  })

  it('should run successfully with none', async () => {
    await awsLambdaRuntimeApplicationGenerator(tree, { ...options, unitTestRunner: 'none' })

    expect(tree.exists('aws-lambda/runtime/src/index.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/runtime/src/index.spec.ts')).toBeFalsy()
  })
})
