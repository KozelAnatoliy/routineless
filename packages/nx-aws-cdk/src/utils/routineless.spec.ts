import { ExecutorContext, Tree, readJsonFile } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { existsSync } from 'fs'

import { getRoutinelessConfig, updateRoutinelessConfig } from './routineless'

jest.mock('fs')
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readJsonFile: jest.fn(),
}))

const mockedExistsSync = jest.mocked(existsSync)
const mockedReadJsonFile = jest.mocked(readJsonFile)

describe('routineless', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getRoutinelessConfig', () => {
    it('should get routineless config if exists', () => {
      jest.spyOn(tree, 'read').mockReturnValue('{"infraApp":"infra"}')
      jest.spyOn(tree, 'exists').mockReturnValue(true)
      const routinelessConfig = getRoutinelessConfig(tree)
      expect(routinelessConfig).toEqual({
        infraApp: 'infra',
      })
    })

    it('should get routineless config if exists using context', () => {
      mockedExistsSync.mockReturnValue(true)
      mockedReadJsonFile.mockReturnValue({
        infraApp: 'infra',
      })
      const routinelessConfig = getRoutinelessConfig({ root: '/root' } as ExecutorContext)
      expect(routinelessConfig).toEqual({
        infraApp: 'infra',
      })
    })

    it('should return default config if routineless config does not exist', () => {
      const routinelessConfig = getRoutinelessConfig(tree)
      expect(routinelessConfig).toEqual({})
    })

    it('should return default config if routineless config does not exist using context', () => {
      mockedExistsSync.mockReturnValue(false)
      const routinelessConfig = getRoutinelessConfig({ root: '/root' } as ExecutorContext)
      expect(routinelessConfig).toEqual({})
    })
  })

  describe('updateRoutinelessConfig', () => {
    it('should update routineless config if exists', () => {
      jest.spyOn(tree, 'read').mockReturnValue('{"infraApp":"infra"}')
      jest.spyOn(tree, 'exists').mockReturnValue(true)
      const writeSpy = jest.spyOn(tree, 'write')

      updateRoutinelessConfig(tree, (config) => {
        config.infraApp = 'test'
        return config
      })
      expect(writeSpy).toHaveBeenCalledTimes(1)
      const callsArgs = writeSpy.mock.calls[0]
      expect(callsArgs && callsArgs[0]).toEqual('.routineless.json')
      expect(callsArgs && callsArgs[1].toString().replace(/\s/g, '')).toEqual(JSON.stringify({ infraApp: 'test' }))
    })

    it('should create routineless config if does not exist', () => {
      const writeSpy = jest.spyOn(tree, 'write')

      updateRoutinelessConfig(tree, (config) => {
        config.infraApp = 'test2'
        return config
      })
      expect(writeSpy).toHaveBeenCalledTimes(2)
      let callsArgs = writeSpy.mock.calls[0]
      expect(callsArgs && callsArgs[0]).toEqual('.routineless.json')
      expect(callsArgs && callsArgs[1].toString().replace(/\s/g, '')).toEqual(JSON.stringify({}))
      callsArgs = writeSpy.mock.calls[1]
      expect(callsArgs && callsArgs[0]).toEqual('.routineless.json')
      expect(callsArgs && callsArgs[1].toString().replace(/\s/g, '')).toEqual(JSON.stringify({ infraApp: 'test2' }))
    })
  })
})
