import type { CreateNodesFunction } from '@nx/devkit'
import { existsSync } from 'fs'
import { dirname } from 'path'

import type { CreateNodesFunctionMapper, NxAwsCdkPluginOptions } from '../../utils/inferrence'

const createCdkAppNode: CreateNodesFunction<NxAwsCdkPluginOptions> = (projectConfigFilePath: string) => {
  const projectRoot = dirname(projectConfigFilePath)

  return {
    projects: {
      [projectRoot]: {
        targets: {
          build: {
            executor: '@routineless/nx-aws-cdk:cdk-build',
            outputs: ['{options.outputPath}'],
            options: {
              outputPath: `dist/${projectRoot}`,
              main: `${projectRoot}/src/main.ts`,
              tsConfig: `${projectRoot}/tsconfig.app.json`,
            },
            cache: true,
            dependsOn: ['^build'],
            inputs: ['production', '^production'],
          },
          localstack: {
            executor: '@routineless/nx-aws-cdk:localstack',
          },
          cdk: {
            executor: '@routineless/nx-aws-cdk:cdk',
            configurations: {
              development: {
                env: 'dev',
                resolve: true,
                'hotswap-fallback': true,
                concurrency: 3,
              },
              production: {
                env: 'prod',
                resolve: true,
              },
            },
            dependsOn: ['build'],
          },
        },
      },
    },
  }
}

const predicate = (projectConfigFilePath: string) =>
  projectConfigFilePath.includes('project.json') &&
  existsSync(projectConfigFilePath.replace('project.json', 'cdk.json'))

const createNodes: CreateNodesFunctionMapper = {
  predicate,
  createNodesFunction: createCdkAppNode,
}

export default createNodes
