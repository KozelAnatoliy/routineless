import { Tree } from '@nx/devkit'

import { getRoutinelessConfig } from '../../utils/routineless'
import { AwsLambdaGeneratorSchema, LambdaPreset } from './schema'

export const getPreset = (tree: Tree, options: AwsLambdaGeneratorSchema): LambdaPreset => {
  if (options.preset) return options.preset

  const routinelessConfig = getRoutinelessConfig(tree)
  return routinelessConfig.defaultLambdaPreset || 'basic'
}
