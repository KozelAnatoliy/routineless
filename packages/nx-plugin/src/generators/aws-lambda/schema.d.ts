import type { Linter } from '@nrwl/linter'

export interface AwsLambdaGeneratorSchema {
  name: string
  tags?: string
  skipFormat?: boolean
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
  directory?: string
}
