import { GeneratorCallback, Tree, formatFiles, runTasksInSerial } from '@nx/devkit'

import { injectProjectProperties } from '../../utils/generators'
import infraGenerator from './infra-generator'
import runtimeGenerator from './runtime-generator'
import { AwsLambdaGeneratorSchema } from './schema'

const awsLambdaGenerator = async (tree: Tree, options: AwsLambdaGeneratorSchema): Promise<GeneratorCallback> => {
  const normalizedOptions = injectProjectProperties(tree, options)

  const tasks: GeneratorCallback[] = []

  tasks.push(
    await runtimeGenerator(tree, {
      ...normalizedOptions,
      directory: normalizedOptions.projectRoot,
      name: 'runtime',
    }),
  )
  tasks.push(
    await infraGenerator(tree, {
      ...normalizedOptions,
      directory: normalizedOptions.projectRoot,
      name: 'infra',
    }),
  )

  if (!options.skipFormat) {
    await formatFiles(tree)
  }
  return runTasksInSerial(...tasks)
}

export default awsLambdaGenerator
