import type { ExecutorContext } from '@nrwl/devkit'
import { logger } from '@nrwl/devkit'
import * as path from 'path'

import executor from '../../../src/executors/cdk'
import type { CdkExecutorOptions } from '../../../src/executors/cdk/schema'
import { ProcessExitInfo, createCommand, runCommandProcess } from '../../../src/utils/cdk/executors'
import { mockExecutorContext } from '../../helpers/executor'

jest.mock('@routineless/nx-plugin/utils/cdk/executors')

const mockedCreateCommand = jest.mocked(createCommand, { shallow: true })
const mockedRunCommandProcess = jest.mocked(runCommandProcess, { shallow: true })

const options: CdkExecutorOptions = {
  command: 'bootstrap',
}

describe('Bootstrap Executor', () => {
  let context: ExecutorContext
  const testCommand = 'testCommand'
  const testProcessExitInfo: ProcessExitInfo = { code: 0, signal: null }

  beforeEach(async () => {
    jest.spyOn(logger, 'error')
    context = mockExecutorContext('bootstrap')
    mockedCreateCommand.mockReturnValue(testCommand)
    mockedRunCommandProcess.mockResolvedValue(testProcessExitInfo)
  })

  afterEach(() => jest.clearAllMocks())

  it('should run cdk bootstrap command', async () => {
    const executionPrommise = executor(options, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommand).toHaveBeenCalledWith({
      command: 'bootstrap',
      parsedArgs: {},
      root: 'apps/proj',
      sourceRoot: 'apps/proj/src',
    })
    expect(mockedRunCommandProcess).toHaveBeenCalledWith(testCommand, path.join(context.root, 'apps/proj'))
    expect(executionResult).toEqual({ success: true })
  })

  describe('options parsing', () => {
    it('should parse unknown options to parsedArgs', async () => {
      const unknownOptions: CdkExecutorOptions = { ...options }
      unknownOptions['profile'] = 'prod'
      unknownOptions['v'] = true
      unknownOptions['_'] = ['FirstStack', 'SecondStack']

      await executor(unknownOptions, context)

      expect(mockedCreateCommand).toHaveBeenCalledWith({
        _: ['FirstStack', 'SecondStack'],
        command: 'bootstrap',
        parsedArgs: {
          _: ['FirstStack', 'SecondStack'],
          profile: 'prod',
          v: true,
        },
        profile: 'prod',
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
        v: true,
      })
    })

    it('should parse args option to parsedArgs', async () => {
      const testOptions: CdkExecutorOptions = { ...options }
      testOptions['args'] = 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy'

      await executor(testOptions, context)

      expect(mockedCreateCommand).toHaveBeenCalledWith({
        args: 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy',
        command: 'bootstrap',
        parsedArgs: {
          _: ['FirstArgsStack', 'SecondArgsStack'],
          j: true,
          profile: 'testProfile',
          proxy: 'testProxy',
        },
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
      })
    })

    it('should override parsed args option with unknown options provided', async () => {
      const unknownOptions: CdkExecutorOptions = { ...options }
      unknownOptions['args'] = 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy'
      unknownOptions['profile'] = 'prod'
      unknownOptions['v'] = true
      unknownOptions['_'] = ['FirstStack', 'SecondStack']

      await executor(unknownOptions, context)

      expect(mockedCreateCommand).toHaveBeenCalledWith({
        _: ['FirstStack', 'SecondStack'],
        args: 'FirstArgsStack SecondArgsStack --profile testProfile -j --proxy testProxy',
        command: 'bootstrap',
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
      })
    })
  })

  it('should return unsuccessful execution on run command failure', async () => {
    const testError = new Error('Command execution error')
    mockedRunCommandProcess.mockRejectedValue(testError)

    const executionResult = await executor(options, context)

    expect(logger.error).toHaveBeenLastCalledWith(`Failed to execute command ${testCommand}: ${testError}`)
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
