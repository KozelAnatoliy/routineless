import type { ProjectGraph, ProjectGraphExternalNode, ProjectGraphProjectNode } from '@nx/devkit'
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils'

export type ProjectGraphNodeOptions = {
  [node: string]: ProjectGraphNodeOptions
}

export type MockProjectGraphOptions = {
  nodesGraph?: ProjectGraphNodeOptions
}

export const mockProjectGraph = (
  options?: MockProjectGraphOptions,
): { projectGraph: ProjectGraph; nodes: DependentBuildableProjectNode[] } => {
  if (!options || !options.nodesGraph)
    return {
      projectGraph: {
        nodes: {
          proj: {
            type: 'app',
            name: 'proj',
            data: { root: 'apps/proj', sourceRoot: 'apps/proj/src' },
          },
        },
        dependencies: { proj: [] },
      },
      nodes: [],
    }

  const resultProjectGraph: ProjectGraph = {
    nodes: {},
    externalNodes: {},
    dependencies: {},
  }

  const nodes = new Map<string, DependentBuildableProjectNode>()
  const createNodes = (key: string, nodeOptions: ProjectGraphNodeOptions) => {
    for (const nodeKey of Object.keys(nodeOptions)) {
      createNodes(nodeKey, nodeOptions[nodeKey]!)
    }

    let node: DependentBuildableProjectNode
    if (nodes.has(key)) {
      node = nodes.get(key)!
    } else {
      if (key.startsWith('i')) {
        node = {
          name: key,
          outputs: [],
          node: {
            name: key,
            type: 'lib',
            data: {
              root: `libs/${key}`,
              sourceRoot: `libs/${key}/src`,
              targets: {
                build: {
                  options: {
                    outputPath: `dist/libs/${key}`,
                  },
                },
              },
            },
          },
        }
        resultProjectGraph.nodes[node.node.name] = node.node as ProjectGraphProjectNode
        nodes.set(key, node)
      } else if (key.startsWith('p')) {
        node = {
          name: key,
          outputs: [],
          node: {
            name: key,
            type: 'app',
            data: {
              root: `apps/${key}`,
              targets: {
                build: {
                  options: {
                    outputPath: `dist/apps/${key}`,
                  },
                },
              },
            },
          },
        }
        resultProjectGraph.nodes[node.node.name] = node.node as ProjectGraphProjectNode
        nodes.set(key, node)
      } else {
        node = {
          name: `npm:${key}`,
          outputs: [],
          node: {
            type: 'npm',
            name: `npm:${key}`,
            data: { packageName: key, version: '1.0.0' },
          },
        }
        resultProjectGraph.externalNodes![node.node.name] = node.node as ProjectGraphExternalNode
        nodes.set(key, node)
      }

      //setup dependencies
      resultProjectGraph.dependencies[node.node.name] = resultProjectGraph.dependencies[node.node.name] ?? []
      for (const nodeKey of Object.keys(nodeOptions)) {
        const depNode = nodes.get(nodeKey)
        resultProjectGraph.dependencies[node.node.name]!.push({
          type: 'static',
          source: node.node.name,
          target: depNode!.node.name,
        })
      }
    }
  }

  for (const nodeKey of Object.keys(options.nodesGraph)) {
    createNodes(nodeKey, options.nodesGraph[nodeKey]!)
  }

  return { projectGraph: resultProjectGraph, nodes: Array.from(nodes.values()) }
}
