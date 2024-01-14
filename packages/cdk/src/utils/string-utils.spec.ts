import { capitalize, toCamelCase } from './string-utils'

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

  describe('toCamelCase', () => {
    it('should convert to camel case', () => {
      expect(toCamelCase('TO_CAMEL')).toEqual('toCamel')
      expect(toCamelCase('to_camel')).toEqual('toCamel')
      expect(toCamelCase('TO-CAMEL')).toEqual('toCamel')
      expect(toCamelCase('to-camel')).toEqual('toCamel')
      expect(toCamelCase('toCamel')).toEqual('toCamel')
      expect(toCamelCase('ToCamel')).toEqual('ToCamel')
    })
  })
})
