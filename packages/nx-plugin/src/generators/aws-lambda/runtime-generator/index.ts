import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  readProjectConfiguration,
  runTasksInSerial,
  updateProjectConfiguration,
} from '@nrwl/devkit'
import { applicationGenerator as nodeApplicationGenerator } from '@nrwl/node'
import { join } from 'path'

import { injectProjectProperties } from '../../../utils/generators'
import { deleteNodeAppRedundantDirs } from '../../../utils/workspace'
import { AwsLambdaGeneratorSchema } from '../schema'

interface AwsLambdaRuntimeGeneratorOptions extends AwsLambdaGeneratorSchema {
  projectName: string
  projectRoot: string
}

const updateAwsLambdaRuntumeProjectConfiguration = (tree: Tree, options: AwsLambdaRuntimeGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.projectName)
  if (projectConfig.targets) {
    delete projectConfig.targets['serve']
  } else {
    projectConfig.targets = {}
  }
  projectConfig.targets = {
    ...projectConfig.targets,
  }

  updateProjectConfiguration(tree, options.projectName, projectConfig)
}

const addFiles = (
  tree: Tree,
  options: AwsLambdaRuntimeGeneratorOptions,
  filesType: 'files' | 'jest-files' = 'files',
) => {
  const templateOptions = {
    template: '',
  }
  generateFiles(tree, join(__dirname, filesType), options.projectRoot, templateOptions)
}

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(host, {}, {})
}

const awsLambdaRuntimeApplicationGenerator = async (
  tree: Tree,
  options: AwsLambdaGeneratorSchema,
): Promise<GeneratorCallback> => {
  const tasks: GeneratorCallback[] = []
  const normalizedOptions = injectProjectProperties(tree, options)

  tasks.push(addDependencies(tree))
  tasks.push(
    await nodeApplicationGenerator(tree, {
      ...normalizedOptions,
      e2eTestRunner: 'none',
      skipFormat: true,
    }),
  )

  deleteNodeAppRedundantDirs(tree, normalizedOptions.projectRoot)
  addFiles(tree, normalizedOptions)
  if (normalizedOptions.unitTestRunner === 'jest') {
    addFiles(tree, normalizedOptions, 'jest-files')
  }
  updateAwsLambdaRuntumeProjectConfiguration(tree, normalizedOptions)

  if (!normalizedOptions.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default awsLambdaRuntimeApplicationGenerator
