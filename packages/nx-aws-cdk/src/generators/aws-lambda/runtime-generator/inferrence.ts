import type { CreateNodesFunction } from '@nx/devkit'
import { existsSync } from 'fs'
import { dirname } from 'path'

import type { CreateNodesFunctionMapper, NxAwsCdkPluginOptions } from '../../../utils/inferrence'

const createLambdaRuntimeNode: CreateNodesFunction<NxAwsCdkPluginOptions> = (projectConfigFilePath: string) => {
  const projectRoot = dirname(projectConfigFilePath)

  return {
    projects: {
      [projectRoot]: {
        targets: {
          build: {
            executor: '@routineless/nx-aws-cdk:lambda-runtime',
            inputs: ['production', '^production'],
            outputs: ['{options.outputPath}'],
            cache: true,
            dependsOn: ['^build'],
            defaultConfiguration: 'development',
            options: {
              outputPath: `dist/${projectRoot}`,
              tsConfig: `${projectRoot}/tsconfig.app.json`,
            },
            configurations: {
              development: {
                bundle: false,
              },
              production: {
                minify: true,
              },
            },
          },
        },
      },
    },
  }
}

const predicate = (projectConfigFilePath: string): boolean =>
  projectConfigFilePath.includes('/runtime/project.json') &&
  existsSync(projectConfigFilePath.replace('/runtime/project.json', '/infra'))

const createNodes: CreateNodesFunctionMapper = {
  predicate,
  createNodesFunction: createLambdaRuntimeNode,
}

export default createNodes
