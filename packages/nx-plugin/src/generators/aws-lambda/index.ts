import { GeneratorCallback, Tree, formatFiles, runTasksInSerial } from '@nrwl/devkit'

import { injectProjectProperties } from '../../utils/generators'
import infraGenerator from './infra-generator'
import runtimeGenerator from './runtime-generator'
import { AwsLambdaGeneratorSchema } from './schema'

export default async function (tree: Tree, options: AwsLambdaGeneratorSchema) {
  const normalizedOptions = injectProjectProperties(tree, options)

  const tasks: GeneratorCallback[] = []

  tasks.push(
    await runtimeGenerator(tree, {
      ...normalizedOptions,
      directory: normalizedOptions.projectDirectory,
      name: 'runtime',
    }),
  )
  tasks.push(
    await infraGenerator(tree, {
      ...normalizedOptions,
      directory: normalizedOptions.projectDirectory,
      name: 'infra',
    }),
  )

  runTasksInSerial(...tasks)
  if (!options.skipFormat) {
    await formatFiles(tree)
  }
}
