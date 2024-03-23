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
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' })
  })

  it('should generate cdk app without routineless config', async () => {
    await generator(tree, options)

    const config = getRoutinelessConfig(tree)

    expect(config).toEqual({})
  })

  it('should not add eslint-plugin-cdk without eslint', async () => {
    await generator(tree, options)

    const packageJson = readJson(tree, 'package.json')

    expect(packageJson.devDependencies['eslint-plugin-cdk']).toBeUndefined()
    expect(packageJson.devDependencies['aws-cdk-lib']).toBeDefined()
  })

  it('should add eslint-plugin-cdk with eslint', async () => {
    await generator(tree, { ...options, linter: Linter.EsLint })

    const packageJson = readJson(tree, 'package.json')

    expect(packageJson.devDependencies['eslint-plugin-cdk']).toBeDefined()
    expect(packageJson.devDependencies['aws-cdk-lib']).toBeDefined()
  })

  it('should generate cdk app without tests', async () => {
    await generator(tree, { ...options, unitTestRunner: 'none' })

    const config = readProjectConfiguration(tree, 'cdk')

    expect(Object.keys(config?.targets || {})).toEqual([])
    expect(tree.exists('apps/cdk/cdk.json')).toBeTruthy()
    expect(tree.exists('apps/cdk/jest.config.ts')).toBeFalsy()
    expect(tree.exists('apps/cdk/src/main.ts')).toBeTruthy()
    expect(tree.exists('apps/cdk/src/stacks/persistance.ts')).toBeTruthy()
    expect(tree.exists('apps/cdk/src/stacks/persistance.spec.ts')).toBeFalsy()
  })

  it('should generate cdk app with tests', async () => {
    await generator(tree, { ...options, unitTestRunner: 'jest' })

    const config = readProjectConfiguration(tree, 'cdk')
    const nxConfig = readJson(tree, 'nx.json')

    expect(Object.keys(config?.targets || {})).toEqual([])
    expect(nxConfig.plugins).toContainEqual({
      plugin: '@nx/jest/plugin',
      options: {
        targetName: 'test',
      },
    })
    expect(tree.exists('apps/cdk/src/stacks/persistance.spec.ts')).toBeTruthy()
  })

  it('should generate cdk app in provided directory', async () => {
    await generator(tree, {
      ...options,
      directory: `dir/${options.name}`,
      name: `dir-${options.name}`,
      unitTestRunner: 'jest',
    })

    const config = readProjectConfiguration(tree, 'dir-cdk')

    expect(Object.keys(config?.targets || {})).toEqual([])
    expect(tree.exists('apps/dir/cdk/cdk.json')).toBeTruthy()
    expect(tree.exists('apps/dir/cdk/jest.config.ts')).toBeTruthy()
    expect(tree.exists('apps/dir/cdk/src/main.ts')).toBeTruthy()
    expect(tree.exists('apps/dir/cdk/src/stacks/persistance.ts')).toBeTruthy()
    expect(tree.exists('apps/dir/cdk/src/stacks/persistance.spec.ts')).toBeTruthy()
  })

  it('should update tsconfig', async () => {
    await generator(tree, options)

    const tsConfig = readJson(tree, 'tsconfig.base.json')
    expect(tsConfig.exclude).toContain('cdk.out')
  })

  it('should update jest config', async () => {
    await generator(tree, { ...options, unitTestRunner: 'jest' })

    const jestConfig = tree.read('apps/cdk/jest.config.ts')

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
