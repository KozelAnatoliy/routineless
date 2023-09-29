import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  readProjectConfiguration,
  runTasksInSerial,
  updateProjectConfiguration,
} from '@nx/devkit'
import { applicationGenerator as nodeApplicationGenerator } from '@nx/node'
import { join } from 'path'

import { injectProjectProperties } from '../../../utils/generators'
import { AWS_LAMBDA_TYPES_VERSION } from '../../../utils/versions'
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

  const buildTarget = projectConfig.targets['build']
  if (buildTarget) {
    buildTarget.options.bundle = true
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
  generateFiles(tree, join(__dirname, 'generatorFiles', filesType), options.projectRoot, templateOptions)
}

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(
    host,
    {},
    {
      '@types/aws-lambda': AWS_LAMBDA_TYPES_VERSION,
    },
  )
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
