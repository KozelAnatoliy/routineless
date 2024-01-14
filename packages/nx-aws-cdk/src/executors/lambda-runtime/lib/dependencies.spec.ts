import { getHelperDependenciesFromProjectGraph } from '@nx/js'
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils'
import { existsSync } from 'fs'
import path from 'path'

import { mockExecutorContext } from '../../../utils/testing/executor'
import { MockProjectGraphOptions, mockProjectGraph } from '../../../utils/testing/project-graph'
import { NormalizedLambdaRuntimeExecutorOptions } from '../schema'
import { dependenciesReducer, getPackageName, resolveDependencies } from './dependencies'

jest.mock('@nx/js/src/utils/buildable-libs-utils', () => ({
  calculateProjectBuildableDependencies: jest.fn(),
}))
jest.mock('@nx/js', () => ({
  getHelperDependenciesFromProjectGraph: jest.fn(),
}))
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  workspaceRoot: path.join(__dirname, 'fixtures', 'dependencies'),
}))
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}))

const mockedGetHelperDependenciesFromProjectGraph = jest.mocked(getHelperDependenciesFromProjectGraph)
const mockedExistsSync = jest.mocked(existsSync)

describe('dependencies', () => {
  const mockProjDeps = {
    i1: {
      i3: {
        e4: {},
      },
      e5: {},
    },
    i2: {
      e6: {},
    },
    i4: {},
    e1: {
      e2: {
        e3: {},
      },
      e4: {},
    },
  }
  const expectedResolved = {
    'proj/i1': {
      'proj/i3': {
        e4: {},
      },
      e5: {},
    },
    'proj/i2': {
      e6: {},
    },
    i4: {},
    e1: {
      e2: {
        e3: {},
      },
      e4: {},
    },
  }
  const mockOptions: MockProjectGraphOptions = {
    nodesGraph: {
      proj: {
        ...mockProjDeps,
      },
      e10: {},
    },
  }
  const { projectGraph: mockedProjectGraph } = mockProjectGraph(mockOptions)
  const options: NormalizedLambdaRuntimeExecutorOptions = {
    includeInternal: true,
    thirdParty: true,
    external: [],
  } as never as NormalizedLambdaRuntimeExecutorOptions
  const tsConfigPath = 'tsConfigPath'
  const context = mockExecutorContext('lambda-runtime', { targetOptions: { tsConfig: tsConfigPath } })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('dependenciesReducer', () => {
    it('should reduce external nad internal dependencies', () => {
      const internal = {
        i1: {},
        i2: {},
      }
      const external = {
        e1: {},
        e2: {},
        e3: {},
        e4: {},
      }
      const { nodes } = mockProjectGraph({
        nodesGraph: {
          ...internal,
          ...external,
        },
      })
      const result = nodes.reduce(dependenciesReducer, { internal: [], external: [] })

      expect(result.internal).toEqual(
        mockProjectGraph({
          nodesGraph: {
            ...internal,
          },
        }).nodes,
      )
      expect(result.external).toEqual(
        mockProjectGraph({
          nodesGraph: {
            ...external,
          },
        }).nodes,
      )
    })
  })

  describe('getPackageName', () => {
    it('should return node name if it is internal', () => {
      const { nodes } = mockProjectGraph({
        nodesGraph: {
          i1: {},
        },
      })
      expect(getPackageName(nodes[0]!)).toEqual('i1')
    })

    it('should return node package name if it is internal', () => {
      const { nodes } = mockProjectGraph({
        nodesGraph: {
          e1: {},
        },
      })
      expect(getPackageName(nodes[0]!)).toEqual('e1')
    })
  })

  describe('resolveDependencies', () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(true)
      mockedGetHelperDependenciesFromProjectGraph.mockReturnValue([])
    })

    const expectDependencies = (result: DependentBuildableProjectNode[], expected: DependentBuildableProjectNode[]) => {
      expect(result.length).toEqual(expected.length)
      const resultNodeNames = result.reduce((acc: Set<string>, node: DependentBuildableProjectNode) => {
        acc.add(node.name)
        return acc
      }, new Set())

      for (const expectedNode of expected) {
        expect(resultNodeNames.has(expectedNode.name)).toBeTruthy()
      }
    }
    it('should return empty array if internal and external deps are excluded', () => {
      const { resolved, excluded } = resolveDependencies(context, mockedProjectGraph, {
        ...options,
        includeInternal: false,
        thirdParty: false,
      })

      expect(resolved.length).toEqual(0)

      const expectedExcludedNodes = mockProjectGraph({
        nodesGraph: {
          'proj/i1': {},
          'proj/i2': {},
          i4: {},
          e1: {},
        },
      }).nodes
      expectDependencies(excluded, expectedExcludedNodes)
    })

    it('should resolve dependencies', () => {
      const { resolved, excluded } = resolveDependencies(context, mockedProjectGraph, options)

      const expectedResolvedNodes = mockProjectGraph({
        nodesGraph: {
          ...expectedResolved,
        },
      }).nodes

      expectDependencies(resolved, expectedResolvedNodes)
      expect(excluded.length).toEqual(0)
    })

    it('should exclude internal deps', () => {
      const { resolved, excluded } = resolveDependencies(context, mockedProjectGraph, {
        ...options,
        includeInternal: false,
      })

      // external node that are a direct dependencies of the project
      const expectedNodesToCopy = mockProjectGraph({
        nodesGraph: {
          e1: {
            e2: {
              e3: {},
            },
            e4: {},
          },
        },
      }).nodes
      expectDependencies(resolved, expectedNodesToCopy)

      // two internal nodes, i3 would not be mentioned because it is a transitive dependency
      const expectedExcluded = mockProjectGraph({
        nodesGraph: {
          'proj/i1': {},
          'proj/i2': {},
          i4: {},
        },
      }).nodes
      expectDependencies(excluded, expectedExcluded)
    })

    it('should exclude external deps', () => {
      const { resolved, excluded } = resolveDependencies(context, mockedProjectGraph, {
        ...options,
        thirdParty: false,
      })

      const expectedNodesToCopy = mockProjectGraph({
        nodesGraph: {
          'proj/i1': {
            'proj/i3': {},
          },
          'proj/i2': {},
          i4: {},
        },
      }).nodes
      expectDependencies(resolved, expectedNodesToCopy)

      const expectedExcluded = mockProjectGraph({
        nodesGraph: {
          e1: {},
          e4: {},
          e5: {},
          e6: {},
        },
      }).nodes
      expectDependencies(excluded, expectedExcluded)
    })

    it('should include only dependable nodes', () => {
      const { resolved, excluded } = resolveDependencies(
        context,
        mockProjectGraph({
          nodesGraph: {
            ...mockOptions.nodesGraph,
            i5: {
              e7: {},
            },
          },
        }).projectGraph,
        options,
      )

      const expectedResolvedNodes = mockProjectGraph({
        nodesGraph: {
          ...expectedResolved,
        },
      }).nodes
      expectDependencies(resolved, expectedResolvedNodes)
      expect(excluded.length).toEqual(0)
    })

    it('should not include external deps from options', () => {
      const { resolved, excluded } = resolveDependencies(context, mockedProjectGraph, {
        ...options,
        external: ['proj/i1', 'e3'],
      })

      const expectedNodes = mockProjectGraph({
        nodesGraph: {
          'proj/i2': {
            e6: {},
          },
          i4: {},
          e1: {
            e2: {},
            e4: {},
          },
        },
      }).nodes
      expectDependencies(resolved, expectedNodes)
      const expectedExcluded = mockProjectGraph({
        nodesGraph: {
          'proj/i1': {},
          e3: {},
        },
      }).nodes
      expectDependencies(excluded, expectedExcluded)
    })

    it('should add helper dependencies', async () => {
      mockedGetHelperDependenciesFromProjectGraph.mockReturnValue([{ target: 'npm:e10' } as any])

      const { resolved, excluded } = resolveDependencies(context, mockedProjectGraph, options)

      const expectedResolvedNodes = mockProjectGraph({
        nodesGraph: {
          ...expectedResolved,
          e10: {},
        },
      }).nodes

      expectDependencies(resolved, expectedResolvedNodes)
      expect(excluded.length).toEqual(0)
    })

    it('should throw error if tsconfig is not resolved', () => {
      mockedExistsSync.mockReturnValue(false)

      expect(() => resolveDependencies(context, mockedProjectGraph, options)).toThrow('Could not find root tsconfig')
    })
  })
})
