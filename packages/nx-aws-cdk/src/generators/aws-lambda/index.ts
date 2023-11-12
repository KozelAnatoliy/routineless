import {
  GeneratorCallback,
  ProjectConfiguration,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  readNxJson,
  readProjectConfiguration,
  runTasksInSerial,
  updateNxJson,
  updateProjectConfiguration,
} from '@nx/devkit'
import { addPropertyToJestConfig } from '@nx/jest'
import { libraryGenerator } from '@nx/node'
import { join } from 'path'

import { ProjectProperties, injectProjectProperties } from '../../utils/generators'
import { logger } from '../../utils/logger'
import { getRoutinelessConfig } from '../../utils/routineless'
import { AWS_LAMBDA_TYPES_VERSION, ROUTINELESS_CDK_VERSION } from '../../utils/versions'
import { deleteNodeLibRedundantDirs, getNpmScope } from '../../utils/workspace'
import { AwsLambdaGeneratorSchema } from './schema'

type AwsLambdaGeneratorOptions = AwsLambdaGeneratorSchema & ProjectProperties

const updateAwsLambdaProjectConfiguration = (tree: Tree, options: AwsLambdaGeneratorOptions) => {
  const projectConfig = readProjectConfiguration(tree, options.projectName)
  const projectTargets = projectConfig.targets ?? {}

  const buildTarget = projectTargets['build']
  if (buildTarget) {
    buildTarget.dependsOn = ['build-runtime']
  }

  projectConfig.targets = {
    ...projectTargets,
    ['build-runtime']: {
      executor: '@nx/esbuild:esbuild',
      outputs: ['{options.outputPath}'],
      defaultConfiguration: 'development',
      options: {
        platform: 'node',
        outputPath: `dist/lambdas-runtime/${options.projectName}`,
        format: ['cjs'],
        bundle: true,
        main: `${options.projectRoot}/src/runtime/main.ts`,
        tsConfig: `${options.projectRoot}/tsconfig.lib.json`,
        thirdParty: true,
        external: ['@aws-sdk/*'],
        assets: ['src/assets'],
        esbuildOptions: {
          sourcemap: true,
          outExtension: {
            '.js': '.js',
          },
        },
      },
      configurations: {
        development: {},
        production: {
          minify: true,
          esbuildOptions: {
            sourcemap: false,
            outExtension: {
              '.js': '.js',
            },
          },
        },
      },
    },
  }

  updateProjectConfiguration(tree, options.projectName, projectConfig)
}

const updateNxConfig = (tree: Tree) => {
  const nxJson = readNxJson(tree)
  if (!nxJson) {
    throw new Error('Failed to read nx.json')
  }
  const targetDefaults = nxJson.targetDefaults ?? {}
  if (!targetDefaults['build-runtime']) {
    targetDefaults['build-runtime'] = {
      cache: true,
      dependsOn: ['^build'],
      inputs: ['production', '^production'],
    }
    updateNxJson(tree, nxJson)
  }
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
  addPropertyToJestConfig(tree, jestConfigPath, 'collectCoverageFrom', ['src/**/*.ts', '!**/*.d.ts', '!src/index.ts'])
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

  updateNxConfig(tree)
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
