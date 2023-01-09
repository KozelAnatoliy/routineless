import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  updateJson,
  updateProjectConfiguration,
} from '@nrwl/devkit'
import { Linter } from '@nrwl/linter'
import { applicationGenerator as nodeApplicationGenerator } from '@nrwl/node'
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial'
import { join } from 'path'

import { CDK_CONSTRUCTS_VERSION, CDK_ESLINT_VERSION, CDK_LOCAL_VERSION, CDK_VERSION } from '../../utils/constants'
import { addGitIgnoreEntries } from '../../utils/workspace'
import { CdkApplicationGeneratorSchema } from './schema'

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

const addFiles = (tree: Tree, options: NormalizedSchema, filesType: 'files' | 'jest-files' = 'files') => {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  }
  generateFiles(tree, join(__dirname, filesType), options.projectRoot, templateOptions)
}

// delete redundant
const deleteNodeAppRedundantDirs = (tree: Tree, options: NormalizedSchema) => {
  tree.delete(`${options.projectRoot}/src/app`)
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
}

const updateInfraProjectConfiguration = (tree: Tree, options: NormalizedSchema) => {
  const projectConfig = readProjectConfiguration(tree, options.projectName)
  if (projectConfig.targets) {
    delete projectConfig.targets.serve
  }
  updateProjectConfiguration(tree, options.projectName, projectConfig)
}

const updateGitIgnore = (tree: Tree) => {
  addGitIgnoreEntries(tree, ['# CDK Context & Staging files', 'cdk.context.json', 'cdk.out/'])
}

export const cdkApplicationGenerator = async (
  tree: Tree,
  options: CdkApplicationGeneratorSchema,
): Promise<GeneratorCallback> => {
  const normalizedOptions = normalizeOptions(tree, options)

  const tasks: GeneratorCallback[] = []

  tasks.push(addDependencies(tree))
  tasks.push(
    await nodeApplicationGenerator(tree, {
      ...normalizedOptions,
      directory: undefined,
      skipFormat: true,
    }),
  )

  addFiles(tree, normalizedOptions)
  if (normalizedOptions.unitTestRunner === 'jest') {
    addFiles(tree, normalizedOptions)
  }

  if (normalizedOptions.linter === Linter.EsLint) {
    updateLintConfig(tree, normalizedOptions)
  }

  deleteNodeAppRedundantDirs(tree, normalizedOptions)
  updateGitIgnore(tree)
  updateInfraProjectConfiguration(tree, normalizedOptions)

  if (!options.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default cdkApplicationGenerator
