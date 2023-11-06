import { Tree, readJson, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { Linter } from '@nx/eslint'

import generator from '.'
import { getRoutinelessConfig } from '../../utils/routineless'
import eslintCdkRules from './eslint-cdk-rules.json'
import type { CdkApplicationGeneratorSchema } from './schema'

describe('cdk-application generator', () => {
  let tree: Tree
  const options: CdkApplicationGeneratorSchema = { name: 'cdk' }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('should generate cdk app without routineless config', async () => {
    await generator(tree, options)

    const config = getRoutinelessConfig(tree)

    expect(config).toBeUndefined()
  })

  it('should add cdk dependencies without eslint', async () => {
    await generator(tree, options)

    const packageJson = readJson(tree, 'package.json')

    expect(packageJson.dependencies['@routineless/cdk']).toBeDefined()
    expect(packageJson.dependencies['aws-cdk-lib']).toBeDefined()
    expect(packageJson.dependencies['constructs']).toBeDefined()
    expect(packageJson.devDependencies['aws-cdk-local']).toBeDefined()
    expect(packageJson.devDependencies['aws-cdk']).toBeDefined()

    expect(packageJson.devDependencies['eslint-plugin-cdk']).toBeUndefined()
  })

  it('should add cdk dependencies with eslint', async () => {
    await generator(tree, { ...options, linter: Linter.EsLint })

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

    expect(Object.keys(config?.targets || {})).toEqual(['build', 'lint'])
    expect(tree.exists('cdk/cdk.json')).toBeTruthy()
    expect(tree.exists('cdk/jest.config.ts')).toBeFalsy()
    expect(tree.exists('cdk/src/main.ts')).toBeTruthy()
    expect(tree.exists('cdk/src/stacks/persistance.ts')).toBeTruthy()
    expect(tree.exists('cdk/src/stacks/persistance.spec.ts')).toBeFalsy()
  })

  it('should generate cdk app with tests', async () => {
    await generator(tree, { ...options, unitTestRunner: 'jest' })

    const config = readProjectConfiguration(tree, 'cdk')

    expect(Object.keys(config?.targets || {})).toEqual(['build', 'lint', 'test'])
    expect(tree.exists('cdk/src/stacks/persistance.spec.ts')).toBeTruthy()
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

    const eslintConfig = readJson(tree, '.eslintrc.json')
    expect(eslintConfig.plugins).toContain('cdk')
    expect(eslintConfig.overrides.length).toBeGreaterThan(0)
    const firstOverride = eslintConfig.overrides[0]
    for (const rule in eslintCdkRules) {
      expect((eslintCdkRules as Record<string, unknown>)[rule]).toEqual(firstOverride.rules[rule])
    }
  })

  it('should set as routineless infra app', async () => {
    await generator(tree, { ...options, setAsRoutinelessInfraApp: true })

    const config = getRoutinelessConfig(tree)

    expect(config?.infraApp).toEqual('cdk')
  })
})
