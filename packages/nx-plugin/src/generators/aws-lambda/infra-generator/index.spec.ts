import { Tree } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

import awsLambdaInfraLibraryGenerator from '.'
import { AwsLambdaGeneratorSchema } from '../schema'

describe('awsLambdaInfraLibraryGenerator', () => {
  let tree: Tree
  const options: AwsLambdaGeneratorSchema = {
    unitTestRunner: 'jest',
    skipFormat: false,
    directory: 'aws-lambda',
    name: 'infra',
  }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('should run successfully', async () => {
    await awsLambdaInfraLibraryGenerator(tree, { ...options, unitTestRunner: 'none' })

    expect(tree.exists('aws-lambda/infra/src/index.ts')).toBeTruthy()
    expect(tree.exists('aws-lambda/infra/src/index.spec.ts')).toBeFalsy()
  })

  it('should run successfully with jest', async () => {
    await awsLambdaInfraLibraryGenerator(tree, options)

    expect(tree.exists('aws-lambda/infra/src/index.spec.ts')).toBeTruthy()
  })
})
