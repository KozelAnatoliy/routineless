import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  runTasksInSerial,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit'
import { Linter } from '@nx/eslint'
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node'
import { join } from 'path'

import { ProjectProperties, injectProjectProperties } from '../../utils/generators'
import { updateRoutinelessConfig } from '../../utils/routineless'
import {
  CDK_CONSTRUCTS_VERSION,
  CDK_ESLINT_VERSION,
  CDK_LOCAL_VERSION,
  CDK_VERSION,
  ROUTINELESS_CDK_VERSION,
} from '../../utils/versions'
import { addGitIgnoreEntries, deleteNodeAppRedundantDirs, getNpmScope } from '../../utils/workspace'
import eslintCdkRules from './eslint-cdk-rules.json'
import type { CdkApplicationGeneratorSchema } from './schema'

type NormalizedSchema = CdkApplicationGeneratorSchema & ProjectProperties

const addFiles = (tree: Tree, options: NormalizedSchema, filesType: 'files' | 'jest-files' = 'files') => {
  const scope = getNpmScope(tree)
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    workspaceName: scope || 'aws-cdk-app',
    template: '',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles', filesType), options.projectRoot, templateOptions)
}

const updateLintConfig = (tree: Tree, options: NormalizedSchema) => {
  updateJson(tree, `${options.projectRoot}/.eslintrc.json`, (json) => {
    json.plugins = json?.plugins || []
    const plugins: string[] = json.plugins

    const hasCdkPlugin = plugins.findIndex((row) => row === 'cdk') >= 0
    if (!hasCdkPlugin) {
      plugins.push('cdk')
    }
    return json
  })
  updateJson(tree, `.eslintrc.json`, (config) => {
    config.plugins = config?.plugins || []
    const plugins: string[] = config.plugins

    const hasCdkPlugin = plugins.findIndex((row) => row === 'cdk') >= 0
    if (!hasCdkPlugin) {
      plugins.push('cdk')
      if (config.overrides && config.overrides[0]) {
        const baseConfigOverride = config.overrides[0]
        baseConfigOverride.rules = {
          ...baseConfigOverride.rules,
          ...eslintCdkRules,
        }
      }
    }

    return config
  })
}

const updateInfraProjectConfiguration = (tree: Tree, options: NormalizedSchema) => {
  const projectConfig = readProjectConfiguration(tree, options.name)
  const projectTargets = projectConfig.targets ?? {}
  delete projectTargets['serve']

  const buildTarget = projectTargets['build']
  if (buildTarget) {
    delete buildTarget.defaultConfiguration
    delete buildTarget.configurations
    buildTarget.options.deleteOutputPath = false
  }

  updateProjectConfiguration(tree, options.projectName, projectConfig)
}

const updateGitIgnore = (tree: Tree) => {
  addGitIgnoreEntries(tree, ['# CDK Context & Staging files', 'cdk.context.json', 'cdk.out/'])
}

const updateTsConfig = (tree: Tree) => {
  updateJson(tree, `tsconfig.base.json`, (tsConfig) => {
    const existingExclusions: string[] = tsConfig.exclude || []
    tsConfig.exclude = [...existingExclusions, 'cdk.out']
    return tsConfig
  })
}

const addDependencies = (host: Tree, options: NormalizedSchema): GeneratorCallback => {
  const devDependencies: Record<string, string> = {
    'aws-cdk-local': CDK_LOCAL_VERSION,
    'aws-cdk': CDK_VERSION,
  }
  if (options.linter === Linter.EsLint) {
    devDependencies['eslint-plugin-cdk'] = CDK_ESLINT_VERSION
  }
  return addDependenciesToPackageJson(
    host,
    {
      '@routineless/cdk': ROUTINELESS_CDK_VERSION,
      'aws-cdk-lib': CDK_VERSION,
      constructs: CDK_CONSTRUCTS_VERSION,
    },
    devDependencies,
  )
}

export const cdkApplicationGenerator = async (
  tree: Tree,
  options: CdkApplicationGeneratorSchema,
): Promise<GeneratorCallback> => {
  const normalizedOptions = injectProjectProperties(tree, options)

  const tasks: GeneratorCallback[] = []

  if (normalizedOptions.setAsRoutinelessInfraApp) {
    updateRoutinelessConfig(tree, (config) => {
      config.infraApp = normalizedOptions.name
      return config
    })
  }
  tasks.push(addDependencies(tree, normalizedOptions))
  tasks.push(
    await nodeApplicationGenerator(tree, {
      ...normalizedOptions,
      directory: normalizedOptions.projectRoot,
      projectNameAndRootFormat: 'as-provided',
      e2eTestRunner: 'none',
      skipFormat: true,
    }),
  )

  updateTsConfig(tree)

  addFiles(tree, normalizedOptions)
  if (normalizedOptions.unitTestRunner === 'jest') {
    addFiles(tree, normalizedOptions, 'jest-files')
  }

  if (normalizedOptions.linter === Linter.EsLint) {
    updateLintConfig(tree, normalizedOptions)
  }

  deleteNodeAppRedundantDirs(tree, normalizedOptions.projectRoot)
  updateGitIgnore(tree)
  updateInfraProjectConfiguration(tree, normalizedOptions)

  if (!options.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default cdkApplicationGenerator
