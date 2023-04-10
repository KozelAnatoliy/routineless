import type { Tree } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

import { addGitIgnoreEntries } from '../../src/utils/workspace'

describe('cdk-application generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

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
})
