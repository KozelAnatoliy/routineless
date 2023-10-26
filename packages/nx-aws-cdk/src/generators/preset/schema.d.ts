import type { Linter } from '@nx/eslint'

export interface PresetGeneratorSchema {
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
  infraAppName?: string
  lambdaAppName?: string
  skipFormat?: boolean
}
