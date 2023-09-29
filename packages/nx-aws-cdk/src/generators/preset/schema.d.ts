import type { Linter } from '@nx/linter'

export interface PresetGeneratorSchema {
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
  infraAppName?: string
  lambdaAppName?: string
  skipFormat?: boolean
}
