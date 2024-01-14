import type { ExecutorContext } from '@nx/devkit'
import type * as child_process from 'child_process'
import EventEmitter from 'events'
import type { Readable, Writable } from 'stream'

import { MockProjectGraphOptions, mockProjectGraph } from './project-graph'

type MockExeutorOptions = {
  targetOptions?: Record<string, unknown>
  mockProjectGraphOptions?: MockProjectGraphOptions
}

export const mockExecutorContext = (executorName: string, options: MockExeutorOptions = {}): ExecutorContext => {
  return {
    projectName: 'proj',
    root: '/root',
    cwd: '/root',
    projectsConfigurations: {
      version: 2,
      projects: {
        proj: {
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
          targets: {
            test: {
              executor: `@routineless/nx-aws-cdk:${executorName}`,
            },
          },
        },
      },
    },
    projectGraph: mockProjectGraph(options.mockProjectGraphOptions).projectGraph,
    nxJsonConfiguration: {},
    target: {
      executor: `@routineless/nx-aws-cdk:${executorName}`,
      options: {
        outputPath: 'dist/apps/proj',
        ...(options.targetOptions ?? {}),
      },
    },
    isVerbose: true,
  }
}

export const mockChildProcess = (): MockChildProcess => {
  const proc = new EventEmitter() as MockChildProcess

  proc.stdout = new EventEmitter() as Readable
  proc.stderr = new EventEmitter() as Readable
  proc.stdin = new EventEmitter() as Writable
  proc.spawnargs = ['/bin/sh', '-c', 'command']

  return proc as MockChildProcess
}

export interface MockChildProcess extends child_process.ChildProcess {
  stdout: Readable
  stderr: Readable
  stdin: Writable
  spawnargs: string[]
}
