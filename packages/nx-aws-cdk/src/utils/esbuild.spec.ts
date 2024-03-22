import { readJsonFile } from '@nx/devkit'
import { sync } from 'fast-glob'
import { Stats, statSync } from 'fs'

import { getEntryPoints } from './esbuild'
import { mockExecutorContext } from './testing/executor'

jest.mock('@nx/devkit', () => ({
  readJsonFile: jest.fn(),
}))
jest.mock('fast-glob', () => ({
  sync: jest.fn(),
}))
jest.mock('fs', () => ({
  statSync: jest.fn(),
}))

const mockedReadJsonFile = jest.mocked(readJsonFile)
const mockedGlobSync = jest.mocked(sync)
const mockedStatSync = jest.mocked(statSync)

describe('esbuild', () => {
  const context = mockExecutorContext('esbuild', {
    mockProjectGraphOptions: {
      nodesGraph: {
        proj: {
          i1: {
            i2: {},
          },
          i2: {},
          im1: {},
        },
      },
    },
  })
  describe('getEntryPoints', () => {
    beforeEach(() => {
      mockedStatSync.mockReturnValue({ isFile: () => true } as Stats)
      mockedReadJsonFile.mockImplementation((tsConfigPath) => {
        const root = tsConfigPath.split('/').slice(0, -1).join('/')
        return {
          include: [`${root}/**/*.ts`],
          exclude: [`${root}/**/*.spec.ts`],
        }
      })
      mockedGlobSync.mockImplementation(() => {
        return [`src/index.ts`, `src/lib.ts`]
      })
    })

    it('should return entry points', () => {
      const result = getEntryPoints('proj', context, { initialTsConfigFileName: 'tsconfig.app.json' })

      expect(mockedGlobSync).toHaveBeenCalledWith(['apps/proj/**/*.ts'], {
        cwd: 'apps/proj',
        ignore: ['apps/proj/**/*.spec.ts'],
      })
      expect(result).toEqual(['apps/proj/src/index.ts', 'apps/proj/src/lib.ts'])
    })

    it('should return entry points with initial entry points', () => {
      const result = getEntryPoints('proj', context, {
        initialEntryPoints: ['apps/proj/src/initialEntry.ts'],
      })

      expect(result).toEqual(['apps/proj/src/initialEntry.ts', 'apps/proj/src/index.ts', 'apps/proj/src/lib.ts'])
    })

    it('should return entry points recursively', () => {
      const result = getEntryPoints('proj', context, { recursive: true })

      expect(result).toEqual([
        'apps/proj/src/index.ts',
        'apps/proj/src/lib.ts',
        'libs/i1/src/index.ts',
        'libs/i1/src/lib.ts',
        'libs/i2/src/index.ts',
        'libs/i2/src/lib.ts',
        'libs/im1/src/index.ts',
        'libs/im1/src/lib.ts',
      ])
    })

    it('should ignore implicit dependencies', () => {
      const result = getEntryPoints('proj', context, { recursive: true, excludeImplicit: true })

      expect(result).toEqual([
        'apps/proj/src/index.ts',
        'apps/proj/src/lib.ts',
        'libs/i1/src/index.ts',
        'libs/i1/src/lib.ts',
        'libs/i2/src/index.ts',
        'libs/i2/src/lib.ts',
      ])
    })

    it('should return empty entries if tsconfig is not found', () => {
      mockedStatSync.mockImplementation(() => {
        throw new Error('An error occurred')
      })
      const result = getEntryPoints('proj', context)

      expect(result).toEqual([])
    })

    it('should return empty entries if project is not in the graph', () => {
      const result = getEntryPoints('nonproj', context)

      expect(result).toEqual([])
    })
  })
})
