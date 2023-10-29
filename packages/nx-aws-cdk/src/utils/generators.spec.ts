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
    const options = {
      name: 'testPackage',
    }

    beforeEach(() => {
      mockedGetWorkspaceLayout.mockReturnValue({
        appsDir: 'apps',
        libsDir: 'libs',
        standaloneAsDefault: false,
      })
    })

    it('should inject project properties', () => {
      const result = injectProjectProperties(tree, { ...options, directory: 'test-dir' })

      expect(result).toMatchObject({
        appDirectory: 'test-dir/test-package',
        projectName: 'test-dir-test-package',
        projectRoot: 'apps/test-dir/test-package',
        projectDirectory: 'apps/test-dir',
      })
    })

    it('should inject project properties without directory', () => {
      const result = injectProjectProperties(tree, options)

      expect(result).toMatchObject({
        appDirectory: 'test-package',
        projectName: 'test-package',
        projectRoot: 'apps/test-package',
        projectDirectory: 'apps',
      })
    })

    it('should inject project properties with apps directory', () => {
      const result = injectProjectProperties(tree, { ...options, directory: 'apps/test-dir' })

      expect(result).toMatchObject({
        appDirectory: 'test-dir/test-package',
        projectName: 'test-dir-test-package',
        projectRoot: 'apps/test-dir/test-package',
        projectDirectory: 'apps/test-dir',
      })
    })

    it('should resolve project directory without apps directory', () => {
      mockedGetWorkspaceLayout.mockReturnValue({
        appsDir: '',
        libsDir: '',
        standaloneAsDefault: false,
      })

      const result = injectProjectProperties(tree, options)

      expect(result).toMatchObject({
        appDirectory: 'test-package',
        projectName: 'test-package',
        projectRoot: 'test-package',
        projectDirectory: '.',
      })
    })

    it('should resolve project directory with directory provided but without apps directory', () => {
      mockedGetWorkspaceLayout.mockReturnValue({
        appsDir: '',
        libsDir: '',
        standaloneAsDefault: false,
      })

      const result = injectProjectProperties(tree, { ...options, directory: 'test-dir' })

      expect(result).toMatchObject({
        appDirectory: 'test-dir/test-package',
        projectName: 'test-dir-test-package',
        projectRoot: 'test-dir/test-package',
        projectDirectory: 'test-dir',
      })
    })
  })
})
