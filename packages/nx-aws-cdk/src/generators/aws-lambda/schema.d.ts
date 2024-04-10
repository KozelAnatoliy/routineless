import { DefaultAppSchema } from '../../types/schema'

export type LambdaPreset = 'basic' | 'routineless'

export interface AwsLambdaGeneratorSchema extends DefaultAppSchema {
  addLambdaToInfraApp?: boolean
  preset?: LambdaPreset
}
