import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  readNxJson,
  readProjectConfiguration,
  runTasksInSerial,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit'
import { Linter } from '@nx/linter'
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node'
import { join } from 'path'

import { updateRoutinelessConfig } from '../../utils/routineless'
import { CDK_CONSTRUCTS_VERSION, CDK_ESLINT_VERSION, CDK_LOCAL_VERSION, CDK_VERSION } from '../../utils/versions'
import { addGitIgnoreEntries, deleteNodeAppRedundantDirs } from '../../utils/workspace'
import eslintCdkRules from './eslint-cdk-rules.json'
import type { CdkApplicationGeneratorSchema } from './schema'

interface NormalizedSchema extends CdkApplicationGeneratorSchema {
  projectName: string
  projectRoot: string
}

const normalizeOptions = (tree: Tree, options: CdkApplicationGeneratorSchema): NormalizedSchema => {
  const name = names(options.name).fileName
  const projectName = name.replace(new RegExp('/', 'g'), '-')
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${name}`

  return {
    ...options,
    projectName,
    projectRoot,
  }
}

const addFiles = (tree: Tree, options: NormalizedSchema, filesType: 'files' | 'jest-files' = 'files') => {
  const nxJson = readNxJson(tree)
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    workspaceName: nxJson?.npmScope || 'test',
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
  const projectConfig = readProjectConfiguration(tree, options.projectName)
  if (projectConfig.targets) {
    delete projectConfig.targets['serve']
  } else {
    projectConfig.targets = {}
  }
  projectConfig.targets = {
    ...projectConfig.targets,
    cdk: {
      executor: '@routineless/nx-aws-cdk:cdk',
      dependsOn: ['build'],
    },
  }
  const buildTarget = projectConfig.targets['build']
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

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(
    host,
    {
      'aws-cdk-lib': CDK_VERSION,
      constructs: CDK_CONSTRUCTS_VERSION,
    },
    {
      'aws-cdk-local': CDK_LOCAL_VERSION,
      'aws-cdk': CDK_VERSION,
      'eslint-plugin-cdk': CDK_ESLINT_VERSION,
    },
  )
}

export const cdkApplicationGenerator = async (
  tree: Tree,
  options: CdkApplicationGeneratorSchema,
): Promise<GeneratorCallback> => {
  const normalizedOptions = normalizeOptions(tree, options)

  const tasks: GeneratorCallback[] = []

  if (normalizedOptions.setAsRoutinelessInfraApp) {
    updateRoutinelessConfig(tree, (config) => {
      config.infraApp = normalizedOptions.projectName
      return config
    })
  }
  tasks.push(addDependencies(tree))
  tasks.push(
    await nodeApplicationGenerator(tree, {
      ...normalizedOptions,
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
