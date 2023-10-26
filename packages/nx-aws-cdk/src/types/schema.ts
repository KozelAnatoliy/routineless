import type { Linter } from '@nx/eslint'

export interface DefaultAppSchema {
  name: string
  tags?: string
  skipFormat?: boolean
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
}
