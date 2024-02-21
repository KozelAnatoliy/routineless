import { Tree, generateFiles, readJson, readNxJson, readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { Linter } from '@nx/eslint'

import generator from '.'
import { getNpmScope } from '../../utils/workspace'
import type { PresetGeneratorSchema } from './schema'

jest.mock('../../utils/workspace')
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  generateFiles: jest.fn(),
  readNxJson: jest.fn(),
}))

const mockedGenerateFiles = jest.mocked(generateFiles)
const mockedReadNxJson = jest.mocked(readNxJson)
const mockedGetNpmScope = jest.mocked(getNpmScope)
const actualReadNxJson = jest.requireActual('@nx/devkit').readNxJson

describe('preset generator', () => {
  let appTree: Tree
  const options: PresetGeneratorSchema = {}
  const npmScope = 'proj'

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' })
    mockedGetNpmScope.mockReturnValue(npmScope)
    mockedGenerateFiles.mockImplementation(jest.requireActual('@nx/devkit').generateFiles)
    mockedReadNxJson.mockImplementation(actualReadNxJson)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should add dependencied to package.json', async () => {
    await generator(appTree, options)

    const packageJson = readJson(appTree, 'package.json')
    expect(packageJson.devDependencies['jsonc-eslint-parser']).toBeDefined()
    expect(packageJson.devDependencies['eslint-plugin-prettier']).toBeDefined()
    expect(packageJson.devDependencies['@tsconfig/strictest']).toBeDefined()
    expect(packageJson.devDependencies['@trivago/prettier-plugin-sort-imports']).toBeDefined()
  })

  it('should not add eslint dependencied to package.json', async () => {
    await generator(appTree, { linter: Linter.None })

    const packageJson = readJson(appTree, 'package.json')
    expect(packageJson.devDependencies['jsonc-eslint-parser']).toBeUndefined()
    expect(packageJson.devDependencies['eslint-plugin-prettier']).toBeUndefined()
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

  it('should not add jest preset and scripts', async () => {
    await generator(appTree, { unitTestRunner: 'none', linter: Linter.None })

    const packageJson = readJson(appTree, 'package.json')
    expect(packageJson.scripts['test']).toBeUndefined()
    expect(packageJson.scripts['test:coverage']).toBeUndefined()
    expect(packageJson.scripts['lint']).toBeUndefined()
    expect(appTree.exists('jest.preset.js')).toBe(false)
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

  it('should default npm scope aws-cdk-app', async () => {
    mockedGetNpmScope.mockReturnValue(undefined)

    await generator(appTree, options)

    expect(mockedGenerateFiles).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), {
      template: '',
      workspaceName: 'aws-cdk-app',
    })
  })

  it('should update tsconfig.base.json', async () => {
    await generator(appTree, options)

    const tsConfig = readJson(appTree, 'tsconfig.base.json')
    expect(tsConfig.extends).toEqual('./node_modules/@tsconfig/strictest/tsconfig.json')
    expect(tsConfig.compilerOptions.resolveJsonModule).toBe(true)
    expect(tsConfig.compilerOptions.skipLibCheck).toBeUndefined()
  })

  it('should update package.json', async () => {
    await generator(appTree, options)

    const packageJson = readJson(appTree, 'package.json')
    expect(packageJson.scripts['build']).toBe('nx run-many --target=build')
    expect(packageJson.scripts['test']).toBe('nx run-many --target=test')
    expect(packageJson.scripts['test:coverage']).toBe(
      'nx run-many --target=test --skip-nx-cache --output-style=static --coverage --passWithNoTests=false',
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

    let lambdaConfig = readProjectConfiguration(appTree, 'test-lambda-infra')
    expect(lambdaConfig).toBeDefined()

    lambdaConfig = readProjectConfiguration(appTree, 'test-lambda-runtime')
    expect(lambdaConfig).toBeDefined()
  })

  it('should fail if read nx json failed', async () => {
    mockedReadNxJson.mockReturnValue(null)

    await expect(generator(appTree, options)).rejects.toThrow(new Error('Failed to read nx.json'))
  })

  it('should update nx json config', async () => {
    const existingPlugin = 'existing-plugin'
    mockedReadNxJson.mockImplementationOnce((tree) => {
      const nxJson = actualReadNxJson(tree)
      nxJson.plugins = [existingPlugin]
      return nxJson
    })

    await generator(appTree, options)
    const resultNxJson = actualReadNxJson(appTree)

    expect(resultNxJson.plugins).toContain(existingPlugin)
    expect(resultNxJson.plugins).toContain('@routineless/nx-aws-cdk')
  })
})
