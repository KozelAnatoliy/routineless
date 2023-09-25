import { Tree, getWorkspaceLayout } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import { injectProjectProperties } from './generators'

jest.mock('@nx/devkit', () => {
  const originalModule = jest.requireActual('@nx/devkit')

  return {
    ...originalModule,
    getWorkspaceLayout: jest.fn(),
  }
})

const mockedGetWorkspaceLayout = jest.mocked(getWorkspaceLayout, { shallow: true })

describe('generators', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })
  describe('injectProjectProperties', () => {
    beforeEach(() => {
      mockedGetWorkspaceLayout.mockReturnValue({
        appsDir: 'apps',
        libsDir: 'libs',
        npmScope: 'test',
        standaloneAsDefault: false,
      })
    })

    it('should inject project properties', () => {
      const options = {
        name: 'testPackage',
        directory: 'test-dir',
      }

      const result = injectProjectProperties(tree, options)

      expect(result).toMatchObject({
        projectName: 'test-dir-test-package',
        projectRoot: 'apps/test-dir/test-package',
        projectDirectory: 'test-dir/test-package',
      })
    })

    it('should inject project properties without directory', () => {
      const options = {
        name: 'testPackage',
      }

      const result = injectProjectProperties(tree, options)

      expect(result).toMatchObject({
        projectName: 'test-package',
        projectRoot: 'apps/test-package',
        projectDirectory: 'test-package',
      })
    })

    it('should inject project properties with apps directory', () => {
      const options = {
        name: 'testPackage',
        directory: 'apps/test-dir',
      }

      const result = injectProjectProperties(tree, options)

      expect(result).toMatchObject({
        projectName: 'test-dir-test-package',
        projectRoot: 'apps/test-dir/test-package',
        projectDirectory: 'test-dir/test-package',
      })
    })
  })
})
