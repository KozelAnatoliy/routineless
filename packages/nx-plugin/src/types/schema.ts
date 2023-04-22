import type { Linter } from '@nrwl/linter'

export interface DefaultAppSchema {
  name: string
  tags?: string
  skipFormat?: boolean
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
}
