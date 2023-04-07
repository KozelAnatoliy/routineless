import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  runTasksInSerial,
  updateJson,
} from '@nrwl/devkit'
import { Linter } from '@nrwl/linter'
import { cdkApplicationGenerator } from '@routineless/nx-plugin/generators/cdk-application'
import { TSCONFIG_NODE_LTS_STRICTEST_VERSION } from '@routineless/nx-plugin/utils/versions'

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
      '@tsconfig/node-lts-strictest': TSCONFIG_NODE_LTS_STRICTEST_VERSION,
    },
  )
}

const updateTsConfig = (tree: Tree) => {
  updateJson(tree, `tsconfig.base.json`, (tsConfig) => {
    //TODO extend node-lts after nx typescript 5 support
    // tsConfig.extends = ['@tsconfig/node-lts/tsconfig.json', '@tsconfig/strictest/tsconfig.json']
    tsConfig.extends = '@tsconfig/node-lts-strictest/tsconfig.json'
    tsConfig.compilerOptions.resolveJsonModule = true

    // Remove properties provided by node-lts
    // tsConfig.compilerOptions.verbatimModuleSyntax = false
    // delete tsConfig.compilerOptions.strict
    delete tsConfig.compilerOptions.lib
    delete tsConfig.compilerOptions.module
    delete tsConfig.compilerOptions.target
    delete tsConfig.compilerOptions.skipLibCheck
    delete tsConfig.compilerOptions.moduleResolution
    return tsConfig
  })
}

// delete redundant
const deleteRedundantFiles = (tree: Tree) => {
  tree.delete('apps/.gitkeep')
}

const presetGenerator = async (tree: Tree, options: PresetGeneratorSchema) => {
  const normalizedOptions = normalizeOptions(tree, options)
  const tasks: GeneratorCallback[] = []

  tasks.push(addDependencies(tree))
  tasks.push(
    await cdkApplicationGenerator(tree, {
      ...normalizedOptions,
      name: normalizedOptions.infraAppName,
      skipFormat: true,
    }),
  )

  updateTsConfig(tree)
  deleteRedundantFiles(tree)

  await formatFiles(tree)
  return runTasksInSerial(...tasks)
}

export default presetGenerator
