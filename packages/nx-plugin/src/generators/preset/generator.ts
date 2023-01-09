import { GeneratorCallback, Tree, formatFiles, updateJson } from '@nrwl/devkit'
import { Linter } from '@nrwl/linter'
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial'

import { cdkApplicationGenerator } from '../cdk-application/generator'
import { PresetGeneratorSchema } from './schema'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface NormalizedSchema extends PresetGeneratorSchema {
  infraAppName: string
}

const normalizeOptions = (tree: Tree, options: PresetGeneratorSchema): NormalizedSchema => {
  return {
    ...options,
    linter: options.linter ?? Linter.EsLint,
    unitTestRunner: options.unitTestRunner ?? 'jest',
    infraAppName: options.infraAppName ?? 'infra',
  }
}

const updateTsConfig = (tree: Tree) => {
  updateJson(tree, `tsconfig.base.json`, (json) => {
    json.compilerOptions.strict = true
    json.compilerOptions.resolveJsonModule = true
    /* let plugins = json.compilerOptions.plugins || []
        const tsAutoMockPlugin = {
      transform: 'ts-auto-mock/transformer',
      cacheBetweenTests: false,
    }
    plugins = [...plugins, tsAutoMockPlugin] 
    json.compilerOptions.plugins = plugins*/
    return json
  })
}

const presetGenerator = async (tree: Tree, options: PresetGeneratorSchema) => {
  const normalizedOptions = normalizeOptions(tree, options)
  const tasks: GeneratorCallback[] = []

  tasks.push(
    await cdkApplicationGenerator(tree, {
      ...normalizedOptions,
      name: normalizedOptions.infraAppName,
      skipFormat: true,
    }),
  )

  updateTsConfig(tree)

  await formatFiles(tree)
  return runTasksInSerial(...tasks)
}

export default presetGenerator
