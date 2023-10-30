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
  readProjectConfiguration,
  runTasksInSerial,
  updateProjectConfiguration,
} from '@nx/devkit'
import { getNpmScope } from '@nx/js/src/utils/package-json/get-npm-scope'
import { libraryGenerator } from '@nx/node'
import { join } from 'path'

import { ProjectProperties, injectProjectProperties } from '../../utils/generators'
import { getRoutinelessConfig } from '../../utils/routineless'
import { AWS_LAMBDA_TYPES_VERSION, ROUTINELESS_CDK_VERSION } from '../../utils/versions'
import { deleteNodeLibRedundantDirs } from '../../utils/workspace'
import { AwsLambdaGeneratorSchema } from './schema'

type AwsLambdaGeneratorOptions = AwsLambdaGeneratorSchema & ProjectProperties

const updateAwsLambdaProjectConfiguration = (tree: Tree, options: AwsLambdaGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.projectName)
  if (!projectConfig.targets) {
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

const addStackToInfraApp = (tree: Tree, options: AwsLambdaGeneratorOptions) => {
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
    const { className } = names(options.projectName)
    const { appDirectory } = options
    const scope = getNpmScope(tree)
    const importStatement = Buffer.from(
      `import { ${className}Stack } from '${scope ? `@${scope}/` : ''}${appDirectory}'\n`,
    )
    const stackCreationStatement = Buffer.from(
      `new ${className}Stack(app, \`${className}Stack\${stackEnvPostfix}\`, { ...baseStackProps })\n`,
    )
    const resultContent = Buffer.concat([importStatement, mainInfraAppFile, stackCreationStatement])
    tree.write(mainInfraAppFilePath, resultContent)
  }
}

const updateJestConfig = (tree: Tree, options: AwsLambdaGeneratorOptions) => {
  const jestConfigPath = join(options.projectRoot, 'jest.config.ts')
  const jestConfigContent = tree.read(jestConfigPath)
  if (jestConfigContent) {
    const testPathIgnorePatterns = Buffer.from(",collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts', '!src/index.ts']}")
    const resultContent = Buffer.concat([
      jestConfigContent.subarray(0, jestConfigContent.length - 3),
      testPathIgnorePatterns,
    ])
    tree.write(jestConfigPath, resultContent)
  }
}

const addFiles = (tree: Tree, options: AwsLambdaGeneratorOptions, filesType: 'files' | 'jest-files' = 'files') => {
  const templateOptions = {
    ...options,
    ...names(options.projectName),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  }
  generateFiles(tree, join(__dirname, 'generatorFiles', filesType), options.projectRoot, templateOptions)
}

const addDependencies = (host: Tree): GeneratorCallback => {
  return addDependenciesToPackageJson(
    host,
    {
      '@routineless/cdk': ROUTINELESS_CDK_VERSION,
    },
    {
      '@types/aws-lambda': AWS_LAMBDA_TYPES_VERSION,
    },
  )
}

const awsLambdaGenerator = async (tree: Tree, options: AwsLambdaGeneratorSchema): Promise<GeneratorCallback> => {
  const normalizedOptions = injectProjectProperties(tree, options)

  const tasks: GeneratorCallback[] = []

  tasks.push(addDependencies(tree))
  tasks.push(
    await libraryGenerator(tree, {
      ...normalizedOptions,
      directory: normalizedOptions.projectDirectory,
      skipFormat: true,
      compiler: 'tsc',
      buildable: true,
    }),
  )

  deleteNodeLibRedundantDirs(tree, normalizedOptions.projectRoot)
  addFiles(tree, normalizedOptions)
  if (normalizedOptions.unitTestRunner === 'jest') {
    addFiles(tree, normalizedOptions, 'jest-files')
    updateJestConfig(tree, normalizedOptions)
  }
  updateAwsLambdaProjectConfiguration(tree, normalizedOptions)
  if (normalizedOptions.addLambdaToInfraApp) {
    addStackToInfraApp(tree, normalizedOptions)
  }

  if (!normalizedOptions.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default awsLambdaGenerator
