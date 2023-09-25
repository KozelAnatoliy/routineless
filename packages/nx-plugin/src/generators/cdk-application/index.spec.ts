import { Tree, readJson, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { Linter } from '@nx/linter'

import generator from '.'
import type { CdkApplicationGeneratorSchema } from './schema'

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

  it('should generate cdk app without tests', async () => {
    await generator(tree, { ...options, unitTestRunner: 'none' })

    const config = readProjectConfiguration(tree, 'cdk')

    expect(Object.keys(config?.targets || {})).toEqual(['build', 'lint', 'cdk'])
    expect(tree.exists('cdk/cdk.json')).toBeTruthy()
    expect(tree.exists('cdk/src/main.ts')).toBeTruthy()
    expect(tree.exists('cdk/src/stacks/persistanceStack.ts')).toBeTruthy()
    expect(tree.exists('cdk/src/stacks/persistanceStack.spec.ts')).toBeFalsy()
  })

  it('should generate cdk app with tests', async () => {
    await generator(tree, { ...options, unitTestRunner: 'jest' })

    const config = readProjectConfiguration(tree, 'cdk')

    expect(Object.keys(config?.targets || {})).toEqual(['build', 'lint', 'test', 'cdk'])
    expect(tree.exists('cdk/src/stacks/persistanceStack.spec.ts')).toBeTruthy()
  })

  it('should update tsconfig', async () => {
    await generator(tree, options)

    const tsConfig = readJson(tree, 'tsconfig.base.json')
    expect(tsConfig.exclude).toContain('cdk.out')
  })

  it('should update jest config', async () => {
    await generator(tree, { ...options, unitTestRunner: 'jest' })

    const jestConfig = tree.read('cdk/jest.config.ts')

    expect(jestConfig).toBeDefined()

    const jestConfigContent = jestConfig?.toString()
    expect(jestConfigContent).toContain("coveragePathIgnorePatterns: ['<rootDir>/src/main.ts']")
  })

  it('should update eslint', async () => {
    await generator(tree, { ...options, linter: Linter.EsLint })

    const eslintConfig = readJson(tree, 'cdk/.eslintrc.json')
    expect(eslintConfig.plugins).toContain('cdk')
  })
})
