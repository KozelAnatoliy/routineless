import {
  GeneratorCallback,
  ProjectConfiguration,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  logger,
  names,
  offsetFromRoot,
  readNxJson,
  readProjectConfiguration,
  runTasksInSerial,
  updateProjectConfiguration,
} from '@nrwl/devkit'
import { libraryGenerator } from '@nrwl/node'
import { join } from 'path'

import { injectProjectProperties } from '../../../utils/generators'
import { getRoutinelessConfig } from '../../../utils/routineless'
import { deleteNodeLibRedundantDirs } from '../../../utils/workspace'
import { AwsLambdaGeneratorSchema } from '../schema'

interface AwsLambdaInfraGeneratorOptions extends AwsLambdaGeneratorSchema {
  baseProjectName: string
  projectName: string
  projectRoot: string
  projectDirectory: string
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
    const { projectDirectory } = options
    const nxJson = readNxJson(tree)
    const importStatement = Buffer.from(
      `import { ${className}Stack } from '@${nxJson?.npmScope}/${projectDirectory}'\n`,
    )
    const stackCreationStatement = Buffer.from(
      `new ${className}Stack(app, '${className}Stack', { ...baseStackProps })\n`,
    )
    const resultContent = Buffer.concat([importStatement, mainInfraAppFile, stackCreationStatement])
    tree.write(mainInfraAppFilePath, resultContent)
  }
}

const updateAwsLambdaInfraProjectConfiguration = (tree: Tree, options: AwsLambdaInfraGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.projectName)

  const implicitDependencies = projectConfig.implicitDependencies || []
  implicitDependencies.push(options.projectName.replace('infra', 'runtime'))
  projectConfig.implicitDependencies = implicitDependencies

  updateProjectConfiguration(tree, options.projectName, projectConfig)
}

const addFiles = (tree: Tree, options: AwsLambdaInfraGeneratorOptions, filesType: 'files' | 'jest-files' = 'files') => {
  const templateOptions = {
    ...options,
    ...names(options.baseProjectName),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    runtimeProjectDirectory: options.projectDirectory.replace('infra', 'runtime'),
    template: '',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles', filesType), options.projectRoot, templateOptions)
}

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(host, {}, {})
}

const normalizeOptions = (tree: Tree, options: AwsLambdaGeneratorSchema): AwsLambdaInfraGeneratorOptions => {
  const projectAwareOptions = injectProjectProperties(tree, options)
  return {
    ...projectAwareOptions,
    baseProjectName: projectAwareOptions.projectName.replace('infra', ''),
  }
}

const awsLambdaInfraLibraryGenerator = async (
  tree: Tree,
  options: AwsLambdaGeneratorSchema,
): Promise<GeneratorCallback> => {
  const tasks: GeneratorCallback[] = []
  const normalizedOptions = normalizeOptions(tree, options)

  tasks.push(addDependencies(tree))
  tasks.push(
    await libraryGenerator(tree, {
      ...normalizedOptions,
      skipFormat: true,
      compiler: 'tsc',
    }),
  )

  deleteNodeLibRedundantDirs(tree, normalizedOptions.projectRoot)
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
