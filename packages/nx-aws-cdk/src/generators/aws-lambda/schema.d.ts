import { DefaultAppSchema } from '../../types/schema'

export interface AwsLambdaGeneratorSchema extends DefaultAppSchema {
  directory?: string
  addLambdaToInfraApp?: boolean
}
