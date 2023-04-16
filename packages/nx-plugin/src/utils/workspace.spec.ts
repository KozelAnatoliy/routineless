import type { Tree } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

import { addGitIgnoreEntries, deleteNodeAppRedundantDirs } from './workspace'

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
})
