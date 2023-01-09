import { Tree, readJson, readProjectConfiguration } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

import generator from '../../../src/generators/cdk-application/generator'
import { CdkApplicationGeneratorSchema } from '../../../src/generators/cdk-application/schema'

describe('cdk-application generator', () => {
  let tree: Tree
  const options: CdkApplicationGeneratorSchema = { name: 'cdk' }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('should add cdk dependencies', async () => {
    await generator(tree, options)

    const packageJson = readJson(tree, 'package.json')

    expect(packageJson.dependencies['aws-cdk-lib']).toBeDefined()
    expect(packageJson.dependencies['constructs']).toBeDefined()
    expect(packageJson.devDependencies['aws-cdk']).toBeDefined()
    expect(packageJson.devDependencies['aws-cdk-local']).toBeDefined()
    expect(packageJson.devDependencies['eslint-plugin-cdk']).toBeDefined()
  })

  it('should update project targets', async () => {
    await generator(tree, options)

    const config = readProjectConfiguration(tree, 'cdk')
    expect(config?.targets?.build).toBeDefined()
    expect(config?.targets?.test).toBeDefined()
    expect(config?.targets?.serve).toBeUndefined()
  })
})
