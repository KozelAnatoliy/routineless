import { Linter } from '@nrwl/linter'

export interface DefaultAppSchema {
  name: string
  skipFormat?: boolean
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
}
