import { Tree, readJson, readProjectConfiguration } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

import generator from '.'
import type { PresetGeneratorSchema } from './schema'

describe('preset generator', () => {
  let appTree: Tree
  const options: PresetGeneratorSchema = {}

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace()
  })

  it('should add dependencied to package.json', async () => {
    await generator(appTree, options)

    const packageJson = readJson(appTree, 'package.json')
    expect(packageJson.devDependencies['jsonc-eslint-parser']).toBeDefined()
    expect(packageJson.devDependencies['eslint-plugin-prettier']).toBeDefined()
    expect(packageJson.devDependencies['@tsconfig/node-lts-strictest']).toBeDefined()
    expect(packageJson.devDependencies['@trivago/prettier-plugin-sort-imports']).toBeDefined()
  })

  it('should add jest preset', async () => {
    await generator(appTree, options)

    const jestPreset = appTree.read('jest.preset.js')
    expect(jestPreset).toBeDefined()

    const jestPresetContent = jestPreset?.toString()
    expect(jestPresetContent).toContain(`testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)']`)
    expect(jestPresetContent).toContain(`coverageReporters: ['html', 'text']`)
    expect(jestPresetContent).toContain(`collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/*.d.ts']`)
  })

  it('should update .prettierrc', async () => {
    await generator(appTree, options)

    const prettierRc = appTree.read('.prettierrc')
    expect(prettierRc).toBeDefined()

    const prettierRcContent = prettierRc?.toString()
    expect(prettierRcContent).toContain(`"singleQuote": true`)
    expect(prettierRcContent).toContain(`"trailingComma": "all"`)
    expect(prettierRcContent).toContain(`"printWidth": 120`)
  })

  it('should add localstack.sh script', async () => {
    await generator(appTree, options)

    const localstackSh = appTree.read('bin/localstack.sh')
    expect(localstackSh).toBeDefined()
    const localstackShContent = localstackSh?.toString()
    expect(localstackShContent).toContain(`localstack start -d`)
    expect(localstackShContent).toContain(`localstack wait -t 30`)
  })

  it('should update tsconfig.base.json', async () => {
    await generator(appTree, options)

    const tsConfig = readJson(appTree, 'tsconfig.base.json')
    expect(tsConfig.extends).toBe('@tsconfig/node-lts-strictest/tsconfig.json')
    expect(tsConfig.compilerOptions.resolveJsonModule).toBe(true)
    expect(tsConfig.compilerOptions.lib).toBeUndefined()
    expect(tsConfig.compilerOptions.module).toBeUndefined()
    expect(tsConfig.compilerOptions.target).toBeUndefined()
    expect(tsConfig.compilerOptions.skipLibCheck).toBeUndefined()
    expect(tsConfig.compilerOptions.moduleResolution).toBeUndefined()
  })

  it('should update package.json', async () => {
    await generator(appTree, options)

    const packageJson = readJson(appTree, 'package.json')
    expect(packageJson.scripts['localstack:start']).toBe('bin/localstack.sh')
    expect(packageJson.scripts['build']).toBe('nx run-many --target=build')
    expect(packageJson.scripts['test']).toBe('nx run-many --target=test')
    expect(packageJson.scripts['test:coverage']).toBe(
      'nx run-many --target=test --codeCoverage=true --output-style="static" --passWithNoTests=false --skip-nx-cache',
    )
    expect(packageJson.scripts['lint']).toBe('nx run-many --target=lint')
  })

  it('should update .eslintrc.json', async () => {
    await generator(appTree, options)

    const eslintrc = readJson(appTree, '.eslintrc.json')
    expect(eslintrc.plugins).toContain('prettier')
    expect(eslintrc.overrides[0].rules['prettier/prettier']).toBe('error')
    const lastOverride = eslintrc.overrides[eslintrc.overrides.length - 1]
    expect(lastOverride.parser).toBe('jsonc-eslint-parser')
    expect(lastOverride.files).toBe('*.json')
  })

  it('should delete redundant files', async () => {
    await generator(appTree, options)

    expect(appTree.exists('apps/.gitkeep')).toBe(false)
  })

  it('should generate infra app', async () => {
    await generator(appTree, options)

    const config = readProjectConfiguration(appTree, 'infra')
    expect(config).toBeDefined()
  })

  it('should generate infra app with provided name', async () => {
    await generator(appTree, { infraAppName: 'my-infra' })

    const config = readProjectConfiguration(appTree, 'my-infra')
    expect(config).toBeDefined()
  })

  it('should generate lambda app', async () => {
    await generator(appTree, { lambdaAppName: 'test-lambda' })

    const lambdaRuntimeConfig = readProjectConfiguration(appTree, 'test-lambda-runtime')
    const lambdaInfraConfig = readProjectConfiguration(appTree, 'test-lambda-infra')
    expect(lambdaRuntimeConfig).toBeDefined()
    expect(lambdaInfraConfig).toBeDefined()
  })
})
