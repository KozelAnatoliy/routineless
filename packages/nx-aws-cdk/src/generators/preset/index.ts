import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  runTasksInSerial,
  updateJson,
} from '@nx/devkit'
import { Linter } from '@nx/eslint'
import { getNpmScope } from '@nx/js/src/utils/package-json/get-npm-scope'
import { removeSync } from 'fs-extra'
import { join } from 'path'

import awsLambdaGenerator from '../../generators/aws-lambda'
import cdkApplicationGenerator from '../../generators/cdk-application'
import {
  ESLINT_PLUGIN_PRETTIER_VERSION,
  JSON_ESLINT_PARSER_VERSION,
  PRETTIER_PLUGIN_SORT_IMPORTS_VERSION,
  TSCONFIG_NODE_LTS_VERSION,
  TSCONFIG_STRICTEST_VERSION,
} from '../../utils/versions'
import type { PresetGeneratorSchema } from './schema'

interface NormalizedSchema extends PresetGeneratorSchema {
  infraAppName: string
}

const normalizeOptions = (_tree: Tree, options: PresetGeneratorSchema): NormalizedSchema => {
  return {
    ...options,
    linter: options.linter ?? Linter.EsLint,
    unitTestRunner: options.unitTestRunner ?? 'jest',
    infraAppName: options.infraAppName ?? 'infra',
  }
}

const addDependencies = (host: Tree, normalizedOptions: NormalizedSchema): GeneratorCallback => {
  let devDependencies: Record<string, string> = {
    '@tsconfig/node-lts': TSCONFIG_NODE_LTS_VERSION,
    '@tsconfig/strictest': TSCONFIG_STRICTEST_VERSION,
    '@trivago/prettier-plugin-sort-imports': PRETTIER_PLUGIN_SORT_IMPORTS_VERSION,
  }

  if (normalizedOptions.linter === Linter.EsLint) {
    devDependencies = {
      ...devDependencies,
      'jsonc-eslint-parser': JSON_ESLINT_PARSER_VERSION,
      'eslint-plugin-prettier': ESLINT_PLUGIN_PRETTIER_VERSION,
    }
  }
  return addDependenciesToPackageJson(host, {}, devDependencies)
}

const addFiles = (tree: Tree, normalizedOptions: NormalizedSchema) => {
  const scope = getNpmScope(tree)
  const templateOptions = {
    template: '',
    workspaceName: scope || 'aws-cdk-app',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles', 'files'), '.', templateOptions)
  if (normalizedOptions.unitTestRunner === 'jest') {
    generateFiles(tree, join(__dirname, 'generatorFiles', 'jest-files'), '.', templateOptions)
  }
}

const updatePackageJson = (tree: Tree, normalizedOptions: NormalizedSchema) => {
  updateJson(tree, `package.json`, (json) => {
    json.scripts = json.scripts || {}
    json.scripts['build'] = 'nx run-many --target=build'
    if (normalizedOptions.unitTestRunner !== 'none') {
      json.scripts['test'] = 'nx run-many --target=test'
      json.scripts['test:coverage'] =
        'nx run-many --target=test --codeCoverage=true --output-style="static" --passWithNoTests=false --skip-nx-cache'
    }
    if (normalizedOptions.linter !== Linter.None) {
      json.scripts['lint'] = 'nx run-many --target=lint'
    }
    return json
  })
}

const updateTsConfig = (tree: Tree) => {
  updateJson(tree, `tsconfig.base.json`, (tsConfig) => {
    //TODO extend node-lts after nx typescript 5 support
    tsConfig.extends = ['@tsconfig/node-lts/tsconfig.json', '@tsconfig/strictest/tsconfig.json']
    tsConfig.compilerOptions.resolveJsonModule = true

    // Remove properties provided by node-lts
    delete tsConfig.compilerOptions.lib
    delete tsConfig.compilerOptions.module
    delete tsConfig.compilerOptions.target
    delete tsConfig.compilerOptions.skipLibCheck
    // delete tsConfig.compilerOptions.moduleResolution
    return tsConfig
  })
}

const updateLintConfig = (tree: Tree) => {
  updateJson(tree, `.eslintrc.json`, (config) => {
    config.plugins = config?.plugins || []
    config.plugins.push('prettier')

    if (config.overrides && config.overrides[0]) {
      const baseConfigOverride = config.overrides[0]
      baseConfigOverride.rules['prettier/prettier'] = 'error'

      config.overrides.push({
        files: '*.json',
        parser: 'jsonc-eslint-parser',
        rules: {},
      })
    }

    return config
  })
}

// delete redundant
const deleteRedundantFiles = (tree: Tree, normalizedOptions: NormalizedSchema) => {
  if (normalizedOptions.lambdaAppName) {
    tree.delete('apps/.gitkeep')
  }
  // detelint .editorconfig using dirrect fs operation because it is used as formatting style source for prettier
  // it will be added after generator changes will be flushed
  removeSync(join(tree.root, '.editorconfig'))
}

const presetGenerator = async (tree: Tree, options: PresetGeneratorSchema) => {
  const normalizedOptions = normalizeOptions(tree, options)
  const tasks: GeneratorCallback[] = []

  tasks.push(addDependencies(tree, normalizedOptions))
  tasks.push(
    await cdkApplicationGenerator(tree, {
      ...normalizedOptions,
      name: normalizedOptions.infraAppName,
      setAsRoutinelessInfraApp: true,
      skipFormat: true,
    }),
  )

  if (normalizedOptions.lambdaAppName) {
    tasks.push(
      await awsLambdaGenerator(tree, {
        ...normalizedOptions,
        name: normalizedOptions.lambdaAppName,
        addLambdaToInfraApp: true,
        skipFormat: true,
      }),
    )
  }

  if (normalizedOptions.linter === Linter.EsLint) {
    updateLintConfig(tree)
  }

  updateTsConfig(tree)
  updatePackageJson(tree, normalizedOptions)
  addFiles(tree, normalizedOptions)
  deleteRedundantFiles(tree, normalizedOptions)

  if (!normalizedOptions.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default presetGenerator
