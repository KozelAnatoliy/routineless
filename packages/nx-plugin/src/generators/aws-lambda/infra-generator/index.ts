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
import { libraryGenerator } from '@nrwl/node'
import { join } from 'path'

import { injectProjectProperties } from '../../../utils/generators'
import { AwsLambdaGeneratorSchema } from '../schema'

interface AwsLambdaInfraGeneratorOptions extends AwsLambdaGeneratorSchema {
  projectName: string
  projectRoot: string
}

const updateAwsLambdaInfraProjectConfiguration = (tree: Tree, options: AwsLambdaInfraGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.projectName)

  updateProjectConfiguration(tree, options.projectName, projectConfig)
}

const addFiles = (tree: Tree, options: AwsLambdaInfraGeneratorOptions, filesType: 'files' | 'jest-files' = 'files') => {
  const templateOptions = {
    template: '',
  }
  generateFiles(tree, join(__dirname, filesType), options.projectRoot, templateOptions)
}

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(host, {}, {})
}

const awsLambdaInfraLibraryGenerator = async (
  tree: Tree,
  options: AwsLambdaGeneratorSchema,
): Promise<GeneratorCallback> => {
  const tasks: GeneratorCallback[] = []
  const normalizedOptions = injectProjectProperties(tree, options)

  tasks.push(addDependencies(tree))
  tasks.push(
    await libraryGenerator(tree, {
      ...options,
      skipFormat: true,
      compiler: 'tsc',
    }),
  )

  addFiles(tree, normalizedOptions)
  if (options.unitTestRunner === 'jest') {
    addFiles(tree, normalizedOptions, 'jest-files')
  }
  updateAwsLambdaInfraProjectConfiguration(tree, normalizedOptions)

  if (!options.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default awsLambdaInfraLibraryGenerator
