export interface PresetGeneratorSchema {
  unitTestRunner?: 'jest' | 'none'
  linter?: Linter
  infraAppName?: string
}
