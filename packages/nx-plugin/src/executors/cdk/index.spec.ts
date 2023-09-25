import type { ExecutorContext } from '@nx/devkit'
import { logger } from '@nx/devkit'

import executor from '.'
import { mockExecutorContext } from '../../utils/testing/executor'
import { ProcessExitInfo, createCommands, runCommandsInParralel } from './executors'
import type { CdkExecutorOptions } from './schema'

jest.mock('./executors')

const mockedCreateCommands = jest.mocked(createCommands, { shallow: true })
const mockedRunCommandsInParralel = jest.mocked(runCommandsInParralel, { shallow: true })

const options: CdkExecutorOptions = {
  command: 'bootstrap',
}

describe('Cdk Executor', () => {
  let context: ExecutorContext
  const testCommands = [{ command: 'testCommand', cwd: 'testCwd' }]
  const testProcessExitInfo: ProcessExitInfo = { code: 0, signal: null }
  const OLD_ENV = process.env

  beforeEach(async () => {
    jest.spyOn(logger, 'error')
    context = mockExecutorContext('bootstrap')
    mockedCreateCommands.mockReturnValue(testCommands)
    mockedRunCommandsInParralel.mockResolvedValue([testProcessExitInfo])
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env = OLD_ENV
  })

  it('should run cdk bootstrap command', async () => {
    const executionPrommise = executor(options, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'bootstrap',
        env: 'local',
        parsedArgs: {},
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
      },
      context,
    )
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should run cdk bootstrap command with provided env', async () => {
    process.env['AWS_ENV'] = 'dev'
    const executionPrommise = executor({ ...options }, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'bootstrap',
        env: 'dev',
        parsedArgs: {},
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
      },
      context,
    )
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should unwrap watch command', async () => {
    await executor({ ...options, command: 'watch' }, context)

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'deploy',
        env: 'local',
        parsedArgs: {
          watch: true,
        },
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
        watch: true,
      },
      context,
    )
  })

  it('should discard watch option for not deploy commands', async () => {
    await executor({ ...options, watch: true }, context)

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'bootstrap',
        env: 'local',
        parsedArgs: {},
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
        watch: false,
      },
      context,
    )
  })

  describe('options parsing', () => {
    it('should parse unknown options to parsedArgs', async () => {
      const unknownOptions: CdkExecutorOptions = { ...options }
      unknownOptions['profile'] = 'prod'
      unknownOptions['v'] = true
      unknownOptions['_'] = ['FirstStack', 'SecondStack']

      await executor(unknownOptions, context)

      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          _: ['FirstStack', 'SecondStack'],
          command: 'bootstrap',
          env: 'local',
          parsedArgs: {
            _: ['FirstStack', 'SecondStack'],
            profile: 'prod',
            v: true,
          },
          profile: 'prod',
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
          v: true,
        },
        context,
      )
    })

    it('should parse args option to parsedArgs', async () => {
      const testOptions: CdkExecutorOptions = { ...options }
      testOptions['args'] = 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy'

      await executor(testOptions, context)

      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          args: 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy',
          command: 'bootstrap',
          env: 'local',
          parsedArgs: {
            _: ['FirstArgsStack', 'SecondArgsStack'],
            j: true,
            profile: 'testProfile',
            proxy: 'testProxy',
          },
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
        },
        context,
      )
    })

    it('should override parsed args option with unknown options provided', async () => {
      const unknownOptions: CdkExecutorOptions = { ...options }
      unknownOptions['args'] = 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy'
      unknownOptions['profile'] = 'prod'
      unknownOptions['v'] = true
      unknownOptions['_'] = ['FirstStack', 'SecondStack']

      await executor(unknownOptions, context)

      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          _: ['FirstStack', 'SecondStack'],
          args: 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy',
          command: 'bootstrap',
          env: 'local',
          parsedArgs: {
            _: ['FirstStack', 'SecondStack'],
            j: true,
            profile: 'prod',
            proxy: 'testProxy',
            v: true,
          },
          profile: 'prod',
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
          v: true,
        },
        context,
      )
    })
  })

  it('should return unsuccessful execution on run command failure', async () => {
    const testError = new Error('Command execution error')
    mockedRunCommandsInParralel.mockRejectedValue(testError)

    const executionResult = await executor(options, context)

    expect(logger.error).toHaveBeenLastCalledWith(
      `Failed to execute commands ${JSON.stringify(testCommands)}: ${testError}`,
    )
    expect(executionResult).toEqual({ success: false })
  })

  describe('normalization options error', () => {
    it('should fail without project name provided', async () => {
      delete context.projectName

      await expect(executor(options, context)).rejects.toThrow(
        'Cdk bootstrap executor should be executed on cdk project',
      )
    })

    it('should fail without projects configurations provided', async () => {
      delete context.projectsConfigurations

      await expect(executor(options, context)).rejects.toThrow(
        'Cdk bootstrap failed. Failed to read project configuration for proj',
      )
    })

    it('should fail without project source root provided', async () => {
      delete context.projectsConfigurations?.projects['proj']?.sourceRoot

      await expect(executor(options, context)).rejects.toThrow(
        'Cdk bootstrap failed. Failed to read source root for proj',
      )
    })
  })
})
