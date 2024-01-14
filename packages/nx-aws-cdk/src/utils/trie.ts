class TrieNode {
  key: string
  children: Map<string, TrieNode>
  isEnd: boolean

  constructor(key: string) {
    this.key = key
    this.isEnd = false
    this.children = new Map<string, TrieNode>()
  }
}

/**
 * Trie represents a Trie data structure. It provides basic Trie operations and simple pattern search.
 */
export class PatternTrie {
  constructor(words?: string[], caseSensitive = true) {
    this._root = new TrieNode('')
    this._caseSensitive = caseSensitive
    this._size = 0
    if (words) {
      for (const word of words) {
        this.add(word)
      }
    }
  }

  protected _size: number

  get size(): number {
    return this._size
  }

  protected _caseSensitive: boolean

  get caseSensitive(): boolean {
    return this._caseSensitive
  }

  protected _root: TrieNode

  get root() {
    return this._root
  }

  /**
   * Add a word to the Trie structure.
   * @param {string} word - The word to add.
   * @returns {boolean} True if the word was successfully added.
   */
  add(word: string): boolean {
    word = this._caseProcess(word)
    let cur = this.root
    let isNewWord = false
    for (const c of word) {
      let nodeC = cur.children.get(c)
      if (!nodeC) {
        nodeC = new TrieNode(c)
        cur.children.set(c, nodeC)
      }
      cur = nodeC
    }
    if (!cur.isEnd) {
      isNewWord = true
      cur.isEnd = true
      this._size++
    }
    return isNewWord
  }

  /**
   * Check if the Trie contains a given word.
   * @param {string} word - The word to check for.
   * @returns {boolean} True if the word is present in the Trie.
   */
  has(word: string): boolean {
    word = this._caseProcess(word)
    let cur = this.root
    for (const c of word) {
      if (cur.children.has('*')) return true
      if (c !== '*') {
        const nodeC = cur.children.get(c)
        if (!nodeC) return false
        cur = nodeC
      } else {
        return !cur.isEnd
      }
    }
    return cur.isEnd
  }

  /**
   *
   * The `getAll` function returns an array of all words in a Trie data structure that start with a given prefix.
   * @param {string} prefix - The `prefix` parameter is a string that represents the prefix that we want to search for in the
   * trie. It is an optional parameter, so if no prefix is provided, it will default to an empty string.
   * @param {number} max - The max count of words will be found
   * @param isAllWhenEmptyPrefix - If true, when the prefix provided as '', returns all the words in the trie.
   * @returns {string[]} an array of strings.
   */
  getAll(prefix = '', max = Number.MAX_SAFE_INTEGER, isAllWhenEmptyPrefix = false): string[] {
    prefix = this._caseProcess(prefix).replace(/\*/g, '')
    const words: string[] = []
    let found = 0

    const dfs = (node: TrieNode, word: string) => {
      for (const char of node.children.keys()) {
        const charNode = node.children.get(char)
        if (charNode !== undefined) {
          dfs(charNode, word.concat(char))
        }
      }
      if (node.isEnd) {
        if (found > max - 1) return
        words.push(word)
        found++
      }
    }

    let startNode = this.root

    if (prefix) {
      let idx = 0
      for (const c of prefix) {
        if (startNode.children.has('*')) return [`${prefix.substring(0, idx)}*`]
        const nodeC = startNode.children.get(c)
        if (nodeC) startNode = nodeC
        else return []
        idx++
      }
    }

    if (isAllWhenEmptyPrefix || startNode !== this.root) dfs(startNode, prefix)

    return words
  }

  /**
   * Remove a word from the Trie structure.
   * @param{string} word - The word to delete.
   * @returns {boolean} True if the word was successfully removed.
   */
  delete(word: string) {
    word = this._caseProcess(word)
    let isDeleted = false
    const dfs = (cur: TrieNode, i: number): boolean => {
      const char = word[i]
      const child = char && cur.children.get(char)
      if (child) {
        if (i === word.length - 1) {
          if (child.isEnd) {
            if (child.children.size > 0) {
              child.isEnd = false
            } else {
              cur.children.delete(char)
            }
            isDeleted = true
            return true
          }
          return false
        }
        const res = dfs(child, i + 1)
        if (res && !cur.isEnd && child.children.size === 0) {
          cur.children.delete(char)
          return true
        }
        return false
      }
      return false
    }

    dfs(this.root, 0)
    if (isDeleted) {
      this._size--
    }
    return isDeleted
  }

  *[Symbol.iterator](): IterableIterator<string> {
    function* _dfs(node: TrieNode, path: string): IterableIterator<string> {
      if (node.isEnd) {
        yield path
      }
      for (const [char, childNode] of node.children) {
        yield* _dfs(childNode, path + char)
      }
    }

    yield* _dfs(this.root, '')
  }

  protected _caseProcess(str: string) {
    if (!this._caseSensitive) {
      str = str.toLowerCase() // Convert str to lowercase if case-insensitive
    }
    return str
  }
}
