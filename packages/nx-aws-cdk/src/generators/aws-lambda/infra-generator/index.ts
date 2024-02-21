import {
  GeneratorCallback,
  ProjectConfiguration,
  Tree,
  formatFiles,
  generateFiles,
  logger,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  runTasksInSerial,
  updateProjectConfiguration,
} from '@nx/devkit'
import { getNpmScope } from '@nx/js/src/utils/package-json/get-npm-scope'
import { libraryGenerator } from '@nx/node'
import { join } from 'path'

import { ProjectProperties } from '../../../utils/generators'
import { getRoutinelessConfig } from '../../../utils/routineless'
import { deleteNodeLibRedundantDirs } from '../../../utils/workspace'
import { AwsLambdaGeneratorSchema } from '../schema'

interface AwsLambdaInfraGeneratorOptions extends AwsLambdaGeneratorSchema {
  baseProjectName: string
  name: string
  directory: string
}

const normalizeOptions = (options: AwsLambdaGeneratorSchema & ProjectProperties): AwsLambdaInfraGeneratorOptions => {
  return {
    ...options,
    name: `${options.name}-infra`,
    directory: `${options.projectRoot}/infra`,
    baseProjectName: options.name,
  }
}

const addStackToInfraApp = (tree: Tree, options: AwsLambdaInfraGeneratorOptions) => {
  const routinelessConfig = getRoutinelessConfig(tree)
  if (!routinelessConfig || !routinelessConfig.infraApp) {
    logger.warn("Could not find infra app name at .routineless.json config. Can't add stack to infra app")
    return
  }
  let infraAppConfig: ProjectConfiguration
  try {
    infraAppConfig = readProjectConfiguration(tree, routinelessConfig.infraApp)
  } catch (e) {
    logger.error('Could not find infra app')
    return
  }
  const mainInfraAppFilePath = join(infraAppConfig.root, 'src/main.ts')
  const mainInfraAppFile = tree.read(mainInfraAppFilePath)
  if (mainInfraAppFile) {
    const { className } = names(options.baseProjectName)
    const { name } = options
    const scope = getNpmScope(tree)
    const importStatement = Buffer.from(`import { ${className}Stack } from '${scope ? `@${scope}/` : ''}${name}'\n`)
    const stackCreationStatement = Buffer.from(
      `new ${className}Stack(app, \`${className}Stack\${stackEnvPostfix}\`, { ...baseStackProps })\n`,
    )
    const resultContent = Buffer.concat([importStatement, mainInfraAppFile, stackCreationStatement])
    tree.write(mainInfraAppFilePath, resultContent)
  }
}

const updateAwsLambdaInfraProjectConfiguration = (tree: Tree, options: AwsLambdaInfraGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.name)

  const implicitDependencies = projectConfig.implicitDependencies || []
  implicitDependencies.push(options.name.replace('infra', 'runtime'))
  projectConfig.implicitDependencies = implicitDependencies

  updateProjectConfiguration(tree, options.name, projectConfig)
}

const addFiles = (tree: Tree, options: AwsLambdaInfraGeneratorOptions, filesType: 'files' | 'jest-files' = 'files') => {
  const templateOptions = {
    ...options,
    ...names(options.baseProjectName),
    offsetFromRoot: offsetFromRoot(options.directory),
    runtimeProjectDirectory: options.directory.replace('infra', 'runtime'),
    template: '',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles', filesType), options.directory, templateOptions)
}

const awsLambdaInfraLibraryGenerator = async (
  tree: Tree,
  options: AwsLambdaGeneratorSchema & ProjectProperties,
): Promise<GeneratorCallback> => {
  const tasks: GeneratorCallback[] = []
  const normalizedOptions = normalizeOptions(options)

  tasks.push(
    await libraryGenerator(tree, {
      ...normalizedOptions,
      projectNameAndRootFormat: 'as-provided',
      skipFormat: true,
      compiler: 'tsc',
      addPlugin: true,
    }),
  )

  deleteNodeLibRedundantDirs(tree, normalizedOptions.directory)
  addFiles(tree, normalizedOptions)
  if (normalizedOptions.unitTestRunner === 'jest') {
    addFiles(tree, normalizedOptions, 'jest-files')
  }
  updateAwsLambdaInfraProjectConfiguration(tree, normalizedOptions)
  if (normalizedOptions.addLambdaToInfraApp) {
    addStackToInfraApp(tree, normalizedOptions)
  }

  if (!normalizedOptions.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default awsLambdaInfraLibraryGenerator
