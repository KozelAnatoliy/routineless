import { Tree, readJson } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import path from 'path'
import { loadConfig } from 'tsconfig-paths'

import { mockExecutorContext } from './testing/executor'
import {
  addGitIgnoreEntries,
  deleteNodeAppRedundantDirs,
  deleteNodeLibRedundantDirs,
  getNpmScope,
  getTsConfigCompilerPaths,
} from './workspace'

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readJson: jest.fn(),
}))
jest.mock('tsconfig-paths', () => ({
  loadConfig: jest.fn(),
}))

const mockerdReadJson = jest.mocked(readJson)
const mockedLoadConfig = jest.mocked(loadConfig)

describe('workspace utils', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('addGitIgnoreEntries', () => {
    it('should add gitignore entries', async () => {
      const readSpy = jest.spyOn(tree, 'read')
      readSpy.mockReturnValue('')
      const existsSpy = jest.spyOn(tree, 'exists')
      existsSpy.mockReturnValue(true)
      const writeSpy = jest.spyOn(tree, 'write')
      const testGitIgnoreEntries = ['#Comment', 'testDir/']

      addGitIgnoreEntries(tree, testGitIgnoreEntries)

      expect(writeSpy).toHaveBeenCalledWith('.gitignore', '\n\n#Comment\ntestDir/')
    })

    it('should not add existing gitignore entries', async () => {
      const readSpy = jest.spyOn(tree, 'read')
      readSpy.mockReturnValue('\n\n#Comment\ntestDir/\notherDir/')
      const existsSpy = jest.spyOn(tree, 'exists')
      existsSpy.mockReturnValue(true)
      const writeSpy = jest.spyOn(tree, 'write')
      const testGitIgnoreEntries = ['testDir/']

      addGitIgnoreEntries(tree, testGitIgnoreEntries)

      expect(writeSpy).toHaveBeenCalledTimes(0)
    })

    it('should not add gitignore entries if .gitignore does not exist', async () => {
      const readSpy = jest.spyOn(tree, 'read')
      readSpy.mockReturnValue('')
      const existsSpy = jest.spyOn(tree, 'exists')
      existsSpy.mockReturnValue(false)
      const writeSpy = jest.spyOn(tree, 'write')
      const testGitIgnoreEntries = ['#Comment', 'testDir/']

      addGitIgnoreEntries(tree, testGitIgnoreEntries)

      expect(writeSpy).toHaveBeenCalledTimes(0)
    })
  })

  describe('deleteNodeAppRedundantDirs', () => {
    it('should delete redundant dirs', async () => {
      const deleteSpy = jest.spyOn(tree, 'delete')
      const projectRoot = 'apps/test-app'

      deleteNodeAppRedundantDirs(tree, projectRoot)

      expect(deleteSpy).toHaveBeenCalledWith(`${projectRoot}/src/app`)
    })
  })

  describe('deleteNodeLibRedundantDirs', () => {
    it('should delete redundant dirs', async () => {
      const deleteSpy = jest.spyOn(tree, 'delete')
      const projectRoot = 'libs/test-lib'

      deleteNodeLibRedundantDirs(tree, projectRoot)

      expect(deleteSpy).toHaveBeenCalledWith(`${projectRoot}/src/lib`)
    })
  })

  describe('getNpmScope', () => {
    it('should return npm scope', () => {
      jest.spyOn(tree, 'exists').mockReturnValueOnce(true)
      mockerdReadJson.mockReturnValueOnce({ name: '@test/test' })

      const result = getNpmScope(tree)

      expect(result).toEqual('test')
    })

    it('should return undefined if package.json does not exist', () => {
      jest.spyOn(tree, 'exists').mockReturnValueOnce(false)

      const result = getNpmScope(tree)

      expect(result).toBeUndefined()
    })

    it('should return undefined if package.json does not have scope in name', () => {
      jest.spyOn(tree, 'exists').mockReturnValueOnce(true)
      mockerdReadJson.mockReturnValueOnce({ name: 'test' })

      const result = getNpmScope(tree)

      expect(result).toBeUndefined()
    })
  })

  describe('getTsConfigCompilerPaths', () => {
    const context = mockExecutorContext('test', { root: path.join(__dirname, 'fixtures', 'tsconfig') })

    beforeEach(() => {
      mockedLoadConfig.mockImplementation(jest.requireActual('tsconfig-paths').loadConfig)
    })

    it('should return tsconfig compiler paths', () => {
      const result = getTsConfigCompilerPaths(context)

      expect(result).toEqual({
        'proj/i1': ['libs/i1'],
        'proj/i2': ['libs/i2'],
        'proj/i3': ['libs/i3'],
      })
    })

    it('should fail if could not find tsconfig file', () => {
      const context = mockExecutorContext('test')

      expect(() => getTsConfigCompilerPaths(context)).toThrow(
        'Could not find a root tsconfig.json or tsconfig.base.json file.',
      )
    })

    it('should fail if counld not load tsconfig', () => {
      mockedLoadConfig.mockReturnValueOnce({ resultType: 'failed', message: 'error' })

      expect(() => getTsConfigCompilerPaths(context)).toThrow('Cannot load tsconfig file')
    })
  })
})
