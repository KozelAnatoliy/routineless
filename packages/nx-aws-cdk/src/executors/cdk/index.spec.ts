import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { ExecutorContext, logger, runExecutor } from '@nx/devkit'
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'
import type { AwsCredentialIdentityProvider, SharedConfigFiles } from '@smithy/types'

import executor from '.'
import { ProcessExitInfo, runCommandsInParralel } from '../../utils/executors'
import { mockExecutorContext } from '../../utils/testing/executor'
import { TARGET_NAME as LOCALSTACK_TARGET_NAME, isRunning } from '../localstack'
import { createCommands } from './executors'
import type { CdkExecutorOptions } from './schema'

jest.mock('@aws-sdk/client-sts')
jest.mock('@aws-sdk/credential-providers')
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  runExecutor: jest.fn(),
}))
jest.mock('@smithy/shared-ini-file-loader')
jest.mock('../../utils/executors')
jest.mock('../localstack', () => ({
  ...jest.requireActual('../localstack'),
  isRunning: jest.fn(),
}))
jest.mock('./executors')

const mockedCreateCommands = jest.mocked(createCommands, { shallow: true })
const mockedRunCommandsInParralel = jest.mocked(runCommandsInParralel, { shallow: true })
const mockedSTSClient = STSClient as jest.MockedClass<typeof STSClient>
const mockedGetCallerIdentityCommand = GetCallerIdentityCommand as jest.MockedClass<typeof GetCallerIdentityCommand>
const mockedFromNodeProviderChain = jest.mocked(fromNodeProviderChain, { shallow: true })
const mockedLoadSharedConfigFiles = jest.mocked(loadSharedConfigFiles, { shallow: true })
const mockedRunExecutor = jest.mocked(runExecutor, { shallow: true })
const mockedIsLocalstackRunningMock = jest.mocked(isRunning, { shallow: true })

const options: CdkExecutorOptions = {
  _: ['diff'],
}

async function* successGeneratorResult() {
  yield { success: true }
}

async function* failGeneratorResult() {
  yield { success: false }
}

describe('Cdk Executor', () => {
  let context: ExecutorContext
  const testCommands = [{ command: 'testCommand', cwd: 'testCwd' }]
  const testProcessExitInfo: ProcessExitInfo = { code: 0, signal: null }
  const defaultExpectedCreateCommandsOptions = {
    command: 'diff',
    _: ['diff'],
    parsedArgs: {
      _: [],
    },
    env: 'local',
    root: 'apps/proj',
    sourceRoot: 'apps/proj/src',
    projectName: 'proj',
  }
  const OLD_ENV = process.env

  beforeEach(async () => {
    jest.spyOn(logger, 'error')
    context = mockExecutorContext('cdk')
    mockedCreateCommands.mockReturnValue(testCommands)
    mockedRunCommandsInParralel.mockResolvedValue([testProcessExitInfo])
    mockedRunExecutor.mockResolvedValue(successGeneratorResult())
    mockedIsLocalstackRunningMock.mockResolvedValue(true)
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env = OLD_ENV
  })

  it('should run cdk diff command', async () => {
    const executionPrommise = executor(options, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(defaultExpectedCreateCommandsOptions, context)
    expect(mockedRunExecutor).not.toHaveBeenCalled()
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should run cdk diff command with provided env ingnoring process env', async () => {
    process.env['AWS_ENV'] = 'dev'
    const executionPrommise = executor({ ...options, env: 'prod' }, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        ...defaultExpectedCreateCommandsOptions,
        env: 'prod',
      },
      context,
    )
    expect(mockedRunExecutor).not.toHaveBeenCalled()
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should run cdk diff command with provided env from process env', async () => {
    process.env['AWS_ENV'] = 'dev'
    const executionPrommise = executor({ ...options }, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        ...defaultExpectedCreateCommandsOptions,
        env: 'dev',
      },
      context,
    )
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should unwrap watch command', async () => {
    await executor({ _: ['watch'] }, context)

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        ...defaultExpectedCreateCommandsOptions,
        command: 'deploy',
        _: ['watch'],
        watch: true,
      },
      context,
    )
  })

  it('should not include watch option to parsed args', async () => {
    await executor({ _: ['deploy'], watch: true }, context)

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        ...defaultExpectedCreateCommandsOptions,
        command: 'deploy',
        _: ['deploy'],
        watch: true,
      },
      context,
    )
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

  describe('options parsing', () => {
    it('should parse unknown options to parsedArgs', async () => {
      const unknownOptions: CdkExecutorOptions = { ...options }
      unknownOptions['profile'] = 'prod'
      unknownOptions['v'] = true
      unknownOptions['_'] = ['diff', 'FirstStack', 'SecondStack']

      await executor(unknownOptions, context)

      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          _: ['diff', 'FirstStack', 'SecondStack'],
          command: 'diff',
          parsedArgs: {
            _: ['FirstStack', 'SecondStack'],
            profile: 'prod',
            v: true,
          },
          profile: 'prod',
          v: true,
        },
        context,
      )
    })
  })

  describe('aws account and region resolution', () => {
    const resolveOptions: CdkExecutorOptions = { ...options, resolve: true }
    const awsProfile = 'awsProfile'
    const awsRegion = 'awsRegion'
    const mockResolvedRegion = 'resolvedRegion'
    const mockedResolvedAccount = 'resolvedAccount'
    let mockIdentityProvider: AwsCredentialIdentityProvider
    let mockedGetCallerIdentityCommandInstance: GetCallerIdentityCommand
    let mockedSTSClientSend: jest.Mock

    beforeEach(() => {
      mockedLoadSharedConfigFiles.mockResolvedValue({
        configFile: {
          [awsProfile]: {
            region: mockResolvedRegion,
          },
        },
      } as unknown as SharedConfigFiles)
      mockIdentityProvider = {} as unknown as AwsCredentialIdentityProvider
      mockedFromNodeProviderChain.mockReturnValueOnce(mockIdentityProvider)
      mockedGetCallerIdentityCommandInstance = {} as unknown as GetCallerIdentityCommand
      mockedGetCallerIdentityCommand.mockImplementation(() => mockedGetCallerIdentityCommandInstance)
      mockedSTSClientSend = jest.fn().mockResolvedValue({ Account: mockedResolvedAccount })
      mockedSTSClient.mockImplementation(
        () =>
          ({
            send: mockedSTSClientSend,
          } as unknown as STSClient),
      )
    })

    it('should include aws account info from options', async () => {
      process.env['AWS_ACCOUNT'] = 'envAwsAccount'
      process.env['AWS_REGION'] = 'envAwsRegion'
      process.env['AWS_PROFILE'] = 'envAwsProfile'
      const awsAccountAwareOptions: CdkExecutorOptions = {
        ...resolveOptions,
        account: 'awsAccount',
        region: awsRegion,
        profile: awsProfile,
      }

      await executor(awsAccountAwareOptions, context)

      expect(mockedLoadSharedConfigFiles).not.toHaveBeenCalled()
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: 'awsProfile',
          },
          account: 'awsAccount',
          region: awsRegion,
          profile: awsProfile,
          resolve: true,
        },
        context,
      )
    })

    it('should include aws account info from env', async () => {
      process.env['AWS_ACCOUNT'] = 'envAwsAccount'
      process.env['AWS_REGION'] = 'envAwsRegion'
      process.env['AWS_PROFILE'] = 'envAwsProfile'

      await executor(resolveOptions, context)

      expect(mockedLoadSharedConfigFiles).not.toHaveBeenCalled()
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: 'envAwsProfile',
          },
          account: 'envAwsAccount',
          region: 'envAwsRegion',
          root: 'apps/proj',
          resolve: true,
        },
        context,
      )
    })

    it('should resolve aws account info from config and sts client', async () => {
      await executor(
        {
          ...resolveOptions,
          profile: awsProfile,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({ profile: awsProfile })
      expect(mockedSTSClient).toHaveBeenCalledWith({ credentials: mockIdentityProvider, region: mockResolvedRegion })
      expect(mockedSTSClientSend).toHaveBeenCalledWith(mockedGetCallerIdentityCommandInstance)
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          account: mockedResolvedAccount,
          region: mockResolvedRegion,
          resolve: true,
        },
        context,
      )
    })

    it('should resolve aws account default region if profile has invalid type', async () => {
      const defaultRegion = 'defaultRegion'
      mockedLoadSharedConfigFiles.mockResolvedValue({
        configFile: {
          ['default']: {
            region: defaultRegion,
          },
        },
      } as unknown as SharedConfigFiles)

      await executor(
        {
          ...resolveOptions,
          profile: true,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({})
      expect(mockedSTSClient).toHaveBeenCalledWith({ credentials: mockIdentityProvider, region: defaultRegion })
      expect(mockedSTSClientSend).toHaveBeenCalledWith(mockedGetCallerIdentityCommandInstance)
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: true,
          },
          profile: true,
          account: mockedResolvedAccount,
          region: defaultRegion,
          resolve: true,
        },
        context,
      )
    })

    it('should resolve default aws region if profile specific is not defined', async () => {
      const defaultRegion = 'defaultRegion'
      mockedLoadSharedConfigFiles.mockResolvedValue({
        configFile: {
          ['default']: {
            region: defaultRegion,
          },
        },
      } as unknown as SharedConfigFiles)

      await executor(
        {
          ...resolveOptions,
          profile: awsProfile,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({ profile: awsProfile })
      expect(mockedSTSClient).toHaveBeenCalledWith({ credentials: mockIdentityProvider, region: defaultRegion })
      expect(mockedSTSClientSend).toHaveBeenCalledWith(mockedGetCallerIdentityCommandInstance)
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          account: mockedResolvedAccount,
          region: defaultRegion,
          resolve: true,
        },
        context,
      )
    })

    it('should resolve aws account only from sts client if region provided', async () => {
      await executor(
        {
          ...resolveOptions,
          profile: awsProfile,
          region: awsRegion,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).not.toHaveBeenCalled()
      expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({ profile: awsProfile })
      expect(mockedSTSClient).toHaveBeenCalledWith({ credentials: mockIdentityProvider, region: awsRegion })
      expect(mockedSTSClientSend).toHaveBeenCalledWith(mockedGetCallerIdentityCommandInstance)
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          account: mockedResolvedAccount,
          region: awsRegion,
          resolve: true,
        },
        context,
      )
    })

    it('should not resolve account if region was not resolved', async () => {
      mockedLoadSharedConfigFiles.mockResolvedValue({
        configFile: {},
      } as unknown as SharedConfigFiles)
      await executor(
        {
          ...resolveOptions,
          profile: awsProfile,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          resolve: true,
        },
        context,
      )
    })

    it('should not resolve account if region resolution failed', async () => {
      mockedLoadSharedConfigFiles.mockRejectedValueOnce(new Error('Failed to load aws config'))
      await executor(
        {
          ...resolveOptions,
          profile: awsProfile,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          resolve: true,
        },
        context,
      )
    })

    it('should not resolve account if sts client failed', async () => {
      mockedSTSClientSend.mockRejectedValueOnce(new Error('Failed to get caller identity'))
      await executor(
        {
          ...resolveOptions,
          profile: awsProfile,
          region: awsRegion,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).not.toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({ profile: awsProfile })
      expect(mockedSTSClient).toHaveBeenCalledWith({ credentials: mockIdentityProvider, region: awsRegion })
      expect(mockedSTSClientSend).toHaveBeenCalledWith(mockedGetCallerIdentityCommandInstance)
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          ...defaultExpectedCreateCommandsOptions,
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          region: awsRegion,
          resolve: true,
        },
        context,
      )
    })
  })

  describe('normalization options error', () => {
    it('should fail without project name provided', async () => {
      delete context.projectName

      await expect(executor(options, context)).rejects.toThrow(
        'Cdk executor should be executed on cdk project. Provided project name: undefined',
      )
    })

    it('should fail without projects configurations provided', async () => {
      delete context.projectsConfigurations

      await expect(executor(options, context)).rejects.toThrow(
        'Cdk executor failed. Failed to read project configuration for proj',
      )
    })

    it('should fail without project source root provided', async () => {
      delete context.projectsConfigurations?.projects['proj']?.sourceRoot

      await expect(executor(options, context)).rejects.toThrow(
        'Cdk executor failed. Failed to read source root for proj',
      )
    })

    it('should fail without cdk command provided', async () => {
      await expect(executor({}, context)).rejects.toThrow('Cdk executor failed. Command is not provided')
    })
  })

  describe('localstack startup', () => {
    it('should start localstack if not running', async () => {
      mockedIsLocalstackRunningMock.mockResolvedValueOnce(false)
      const executionPrommise = executor(options, context)
      const executionResult = await executionPrommise

      expect(mockedRunExecutor).toHaveBeenCalledWith(
        { project: context.projectName, target: LOCALSTACK_TARGET_NAME },
        { command: 'start' },
        context,
      )
      expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
      expect(executionResult).toEqual({ success: true })
    })

    it('should not start localstack for non local env', async () => {
      mockedIsLocalstackRunningMock.mockResolvedValueOnce(false)
      const executionPrommise = executor({ ...options, env: 'prod' }, context)
      const executionResult = await executionPrommise

      expect(mockedRunExecutor).not.toHaveBeenCalled()
      expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
      expect(executionResult).toEqual({ success: true })
    })

    it('should fail cdk executor on failed localstack start', async () => {
      mockedIsLocalstackRunningMock.mockResolvedValueOnce(false)
      mockedRunExecutor.mockResolvedValueOnce(failGeneratorResult())
      const executionPrommise = executor(options, context)
      const executionResult = await executionPrommise

      expect(mockedRunExecutor).toHaveBeenCalledWith(
        { project: context.projectName, target: LOCALSTACK_TARGET_NAME },
        { command: 'start' },
        context,
      )
      expect(mockedRunCommandsInParralel).not.toHaveBeenCalled()
      expect(executionResult).toEqual({ success: false })
    })
  })
})
