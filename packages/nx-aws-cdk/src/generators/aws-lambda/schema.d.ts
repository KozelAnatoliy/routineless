import type { Linter } from '@nx/eslint'

export interface AwsLambdaGeneratorSchema {
  name: string
  tags?: string
  skipFormat?: boolean
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
  directory?: string
  addLambdaToInfraApp?: boolean
}
