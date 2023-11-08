import { DefaultAppSchema } from '../../types/schema'

export interface AwsLambdaGeneratorSchema extends DefaultAppSchema {
  addLambdaToInfraApp?: boolean
}
