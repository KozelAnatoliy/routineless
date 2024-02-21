import {
  GeneratorCallback,
  Tree,
  formatFiles,
  generateFiles,
  readProjectConfiguration,
  runTasksInSerial,
  updateProjectConfiguration,
} from '@nx/devkit'
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node'
import { join } from 'path'

import { ProjectProperties } from '../../../utils/generators'
import { deleteNodeAppRedundantDirs } from '../../../utils/workspace'
import { AwsLambdaGeneratorSchema } from '../schema'

interface AwsLambdaRuntimeGeneratorOptions extends AwsLambdaGeneratorSchema {
  name: string
  directory: string
}

const normalizeOptions = (options: AwsLambdaGeneratorSchema & ProjectProperties): AwsLambdaRuntimeGeneratorOptions => {
  return {
    ...options,
    name: `${options.name}-runtime`,
    directory: `${options.projectRoot}/runtime`,
  }
}

const updateAwsLambdaRuntumeProjectConfiguration = (tree: Tree, options: AwsLambdaRuntimeGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.name)
  const projectTargets = projectConfig.targets ?? {}
  delete projectTargets['serve']
  delete projectTargets['build']

  projectConfig.targets = {
    ...projectConfig.targets,
  }

  updateProjectConfiguration(tree, options.name, projectConfig)
}

const addFiles = (
  tree: Tree,
  options: AwsLambdaRuntimeGeneratorOptions,
  filesType: 'files' | 'jest-files' = 'files',
) => {
  const templateOptions = {
    template: '',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles', filesType), options.directory, templateOptions)
}

const awsLambdaRuntimeApplicationGenerator = async (
  tree: Tree,
  options: AwsLambdaGeneratorSchema & ProjectProperties,
): Promise<GeneratorCallback> => {
  const tasks: GeneratorCallback[] = []
  const normalizedOptions = normalizeOptions(options)

  tasks.push(
    await nodeApplicationGenerator(tree, {
      ...normalizedOptions,
      projectNameAndRootFormat: 'as-provided',
      e2eTestRunner: 'none',
      skipFormat: true,
      addPlugin: true,
    }),
  )

  deleteNodeAppRedundantDirs(tree, normalizedOptions.directory)
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
