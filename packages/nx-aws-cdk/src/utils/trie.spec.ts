import { PatternTrie } from './trie'

describe('Trie', () => {
  describe('PatternTrie', () => {
    const words = ['@aws-sdk/*', 'swc', '@nx/*', 'lodash']
    const trie = new PatternTrie(words)

    describe('trie pattern matching', () => {
      it('should return true for pattern matching input', () => {
        expect(trie.has('@aws-sdk/lambda')).toBeTruthy()
        expect(trie.has('lodash')).toBeTruthy()
      })

      it('should return false for pattern not matching input', () => {
        expect(trie.has('cdk')).toBeFalsy()
      })

      it('should return all matching words', () => {
        expect(trie.getAll('@aws-sdk/lambda')).toEqual(['@aws-sdk/*'])
        expect(trie.getAll('lodash')).toEqual(['lodash'])
        expect(trie.getAll('sw')).toEqual(['swc'])
        expect(trie.getAll('', 1, false)).toEqual([])
      })
    })

    describe('input pattern matching', () => {
      const words = [
        '@aws-sdk/client-sts',
        '@aws-sdk/credential-providers',
        '@nx/devkit',
        'lodash',
        '@nx/js',
        '@nx/jest',
      ]
      const trie = new PatternTrie(words)

      it('should return true for pattern matching input', () => {
        expect(trie.has('@aws-sdk/*')).toBeTruthy()
        expect(trie.has('lodash')).toBeTruthy()
        expect(trie.has('@nx/*')).toBeTruthy()
      })

      it('should return false for pattern not matching input', () => {
        expect(trie.has('cdk')).toBeFalsy()
        expect(trie.has('@nx/es*')).toBeFalsy()
      })

      it('should return all matching words', () => {
        expect(trie.getAll('@aws-sdk/*')).toEqual(['@aws-sdk/client-sts', '@aws-sdk/credential-providers'])
        expect(trie.getAll('@aws-sdk/*', 1)).toEqual(['@aws-sdk/client-sts'])
        expect(trie.getAll('@nx/*')).toEqual(['@nx/devkit', '@nx/js', '@nx/jest'])
        expect(trie.getAll('@nx/j*')).toEqual(['@nx/js', '@nx/jest'])
        expect(trie.getAll('lod')).toEqual(['lodash'])
      })

      it('should resolve get all properly', () => {
        const trie = new PatternTrie(['libs/i1', 'libs/i2', 'libs/i3'])
        expect(trie.getAll('libs/i4')).toEqual([])
        expect(trie.getAll('libs/i1')).toEqual(['libs/i1'])
        expect(trie.getAll('libs')).toEqual(['libs/i1', 'libs/i2', 'libs/i3'])
      })
    })

    it('should implement delete', () => {
      const testTrie = new PatternTrie(['@aws-sdk/client', '@aws-sdk/client-lambda'])

      expect(testTrie.has('@aws-sdk/client')).toBeTruthy()
      expect(testTrie.delete('@aws-sdk/client')).toBeTruthy()
      expect(testTrie.delete('@aws-sdk/client')).toBeFalsy()
      expect(testTrie.has('@aws-sdk/client')).toBeFalsy()
      expect(testTrie.has('@aws-sdk/client-lambda')).toBeTruthy()

      expect(testTrie.has('@aws-sdk/unregistered')).toBeFalsy()
      expect(testTrie.delete('@aws-sdk/unregistered')).toBeFalsy()
    })

    it('should return current size', () => {
      const testTrie = new PatternTrie(words)

      expect(testTrie.size).toBe(4)
      testTrie.add('cdk')
      expect(testTrie.size).toBe(5)
      testTrie.delete('cdk')
      testTrie.delete('@aws-sdk/*')
      expect(testTrie.size).toBe(3)
    })

    it('should return case sensitive', () => {
      const testTrie = new PatternTrie(words, false)

      expect(testTrie.caseSensitive).toBeFalsy()
      expect(trie.caseSensitive).toBeTruthy()
    })

    it('should implement iterator', () => {
      const resolvedWords = []
      for (const word of trie) {
        resolvedWords.push(word)
      }

      expect(resolvedWords.length).toEqual(words.length)
      expect(resolvedWords).toEqual(expect.arrayContaining(words))
    })
  })
})
