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
    expect(packageJson.devDependencies['@tsconfig/node-lts-strictest']).toBeDefined()
  })

  it('should add files', async () => {
    await generator(appTree, options)

    const jestPreset = appTree.read('jest.preset.js')

    expect(jestPreset).toBeDefined()

    const jestPresetContent = jestPreset?.toString()
    expect(jestPresetContent).toContain(`testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)']`)
    expect(jestPresetContent).toContain(`coverageReporters: ['html', 'text']`)
    expect(jestPresetContent).toContain(`collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/*.d.ts']`)
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

  it('should delete redundant files', async () => {
    await generator(appTree, options)

    expect(appTree.exists('apps/.gitkeep')).toBe(false)
  })

  it('should add infra app', async () => {
    await generator(appTree, options)

    const config = readProjectConfiguration(appTree, 'infra')
    expect(config).toBeDefined()
  })
})
