import type { Linter } from '@nrwl/linter'

export interface PresetGeneratorSchema {
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
  infraAppName?: string
}
