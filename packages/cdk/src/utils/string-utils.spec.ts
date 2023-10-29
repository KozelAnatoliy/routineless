import { capitalize } from './string-utils'

describe('StringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalize('test')).toBe('Test')
    })

    it('should capitalize single letter', () => {
      expect(capitalize('t')).toBe('T')
    })

    it('should not fail on empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should not fail on undefined', () => {
      expect(capitalize(undefined)).toBeUndefined()
    })
  })
})
