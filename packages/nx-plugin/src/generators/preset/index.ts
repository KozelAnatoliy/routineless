import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  runTasksInSerial,
  updateJson,
} from '@nx/devkit'
import { Linter } from '@nx/linter'
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

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(
    host,
    {},
    {
      'jsonc-eslint-parser': JSON_ESLINT_PARSER_VERSION,
      'eslint-plugin-prettier': ESLINT_PLUGIN_PRETTIER_VERSION,
      '@tsconfig/node-lts': TSCONFIG_NODE_LTS_VERSION,
      '@tsconfig/strictest': TSCONFIG_STRICTEST_VERSION,
      '@trivago/prettier-plugin-sort-imports': PRETTIER_PLUGIN_SORT_IMPORTS_VERSION,
    },
  )
}

const addFiles = (tree: Tree) => {
  const templateOptions = {
    template: '',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles'), '.', templateOptions)
  tree.changePermissions('bin/localstack.sh', '755')
}

const updatePackageJson = (tree: Tree) => {
  updateJson(tree, `package.json`, (json) => {
    json.scripts = json.scripts || {}
    json.scripts['localstack:start'] = 'bin/localstack.sh'
    json.scripts['build'] = 'nx run-many --target=build'
    json.scripts['test'] = 'nx run-many --target=test'
    json.scripts['test:coverage'] =
      'nx run-many --target=test --codeCoverage=true --output-style="static" --passWithNoTests=false --skip-nx-cache'
    json.scripts['lint'] = 'nx run-many --target=lint'
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
const deleteRedundantFiles = (tree: Tree) => {
  tree.delete('apps/.gitkeep')
  // detelint .editorconfig using dirrect fs operation because it is used as formatting style source for prettier
  // it will be added after generator changes will be flushed
  removeSync(join(tree.root, '.editorconfig'))
}

const presetGenerator = async (tree: Tree, options: PresetGeneratorSchema) => {
  const normalizedOptions = normalizeOptions(tree, options)
  const tasks: GeneratorCallback[] = []

  tasks.push(addDependencies(tree))
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
  updatePackageJson(tree)
  addFiles(tree)
  deleteRedundantFiles(tree)

  if (!normalizedOptions.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default presetGenerator
