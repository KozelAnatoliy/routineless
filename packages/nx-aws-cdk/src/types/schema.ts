import type { Linter } from '@nx/linter'

export interface DefaultAppSchema {
  name: string
  tags?: string
  skipFormat?: boolean
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
}
