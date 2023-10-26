import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import type { ExecutorContext } from '@nx/devkit'
import { logger } from '@nx/devkit'
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'
import type { AwsCredentialIdentityProvider, SharedConfigFiles } from '@smithy/types'

import executor from '.'
import { mockExecutorContext } from '../../utils/testing/executor'
import { ProcessExitInfo, createCommands, runCommandsInParralel } from './executors'
import type { CdkExecutorOptions } from './schema'

jest.mock('@aws-sdk/client-sts')
jest.mock('@aws-sdk/credential-providers')
jest.mock('@smithy/shared-ini-file-loader')
jest.mock('./executors')

const mockedCreateCommands = jest.mocked(createCommands, { shallow: true })
const mockedRunCommandsInParralel = jest.mocked(runCommandsInParralel, { shallow: true })
const mockedSTSClient = STSClient as jest.MockedClass<typeof STSClient>
const mockedGetCallerIdentityCommand = GetCallerIdentityCommand as jest.MockedClass<typeof GetCallerIdentityCommand>
const mockedFromNodeProviderChain = jest.mocked(fromNodeProviderChain, { shallow: true })
const mockedLoadSharedConfigFiles = jest.mocked(loadSharedConfigFiles, { shallow: true })

const options: CdkExecutorOptions = {
  _: ['diff'],
}

describe('Cdk Executor', () => {
  let context: ExecutorContext
  const testCommands = [{ command: 'testCommand', cwd: 'testCwd' }]
  const testProcessExitInfo: ProcessExitInfo = { code: 0, signal: null }
  const OLD_ENV = process.env

  beforeEach(async () => {
    jest.spyOn(logger, 'error')
    context = mockExecutorContext('diff')
    mockedCreateCommands.mockReturnValue(testCommands)
    mockedRunCommandsInParralel.mockResolvedValue([testProcessExitInfo])
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env = OLD_ENV
  })

  it('should run cdk diff command', async () => {
    const executionPrommise = executor(options, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'diff',
        _: ['diff'],
        parsedArgs: {
          _: [],
        },
        env: 'local',
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
      },
      context,
    )
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should run cdk diff command with provided env ingnoring process env', async () => {
    process.env['AWS_ENV'] = 'dev'
    const executionPrommise = executor({ ...options, env: 'prod' }, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'diff',
        env: 'prod',
        _: ['diff'],
        parsedArgs: {
          _: [],
        },
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
      },
      context,
    )
    expect(mockedRunCommandsInParralel).toHaveBeenCalledWith(testCommands)
    expect(executionResult).toEqual({ success: true })
  })

  it('should run cdk diff command with provided env from process env', async () => {
    process.env['AWS_ENV'] = 'dev'
    const executionPrommise = executor({ ...options }, context)
    const executionResult = await executionPrommise

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'diff',
        env: 'dev',
        _: ['diff'],
        parsedArgs: {
          _: [],
        },
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
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
        command: 'deploy',
        env: 'local',
        _: ['watch'],
        parsedArgs: {
          _: [],
        },
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
        watch: true,
      },
      context,
    )
  })

  it('should not include watch option to parsed args', async () => {
    await executor({ _: ['deploy'], watch: true }, context)

    expect(mockedCreateCommands).toHaveBeenCalledWith(
      {
        command: 'deploy',
        env: 'local',
        _: ['deploy'],
        parsedArgs: {
          _: [],
        },
        root: 'apps/proj',
        sourceRoot: 'apps/proj/src',
        watch: true,
      },
      context,
    )
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
          _: ['diff', 'FirstStack', 'SecondStack'],
          command: 'diff',
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
  })

  describe('aws account and region resolution', () => {
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
        ...options,
        account: 'awsAccount',
        region: awsRegion,
        profile: awsProfile,
      }

      await executor(awsAccountAwareOptions, context)

      expect(mockedLoadSharedConfigFiles).not.toHaveBeenCalled()
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: 'awsProfile',
          },
          account: 'awsAccount',
          region: awsRegion,
          profile: awsProfile,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
        },
        context,
      )
    })

    it('should include aws account info from env', async () => {
      process.env['AWS_ACCOUNT'] = 'envAwsAccount'
      process.env['AWS_REGION'] = 'envAwsRegion'
      process.env['AWS_PROFILE'] = 'envAwsProfile'

      await executor(options, context)

      expect(mockedLoadSharedConfigFiles).not.toHaveBeenCalled()
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: 'envAwsProfile',
          },
          account: 'envAwsAccount',
          region: 'envAwsRegion',
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
        },
        context,
      )
    })

    it('should resolve aws account info from config and sts client', async () => {
      await executor(
        {
          ...options,
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
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          account: mockedResolvedAccount,
          region: mockResolvedRegion,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
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
          ...options,
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
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          account: mockedResolvedAccount,
          region: defaultRegion,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
        },
        context,
      )
    })

    it('should resolve aws account only from sts client if region provided', async () => {
      await executor(
        {
          ...options,
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
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          account: mockedResolvedAccount,
          region: awsRegion,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
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
          ...options,
          profile: awsProfile,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
        },
        context,
      )
    })

    it('should not resolve account if region resolution failed', async () => {
      mockedLoadSharedConfigFiles.mockRejectedValueOnce(new Error('Failed to load aws config'))
      await executor(
        {
          ...options,
          profile: awsProfile,
        },
        context,
      )

      expect(mockedLoadSharedConfigFiles).toHaveBeenCalledTimes(1)
      expect(mockedFromNodeProviderChain).not.toHaveBeenCalled()
      expect(mockedCreateCommands).toHaveBeenCalledWith(
        {
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
        },
        context,
      )
    })

    it('should not resolve account if sts client failed', async () => {
      mockedSTSClientSend.mockRejectedValueOnce(new Error('Failed to get caller identity'))
      await executor(
        {
          ...options,
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
          _: ['diff'],
          command: 'diff',
          env: 'local',
          parsedArgs: {
            _: [],
            profile: awsProfile,
          },
          profile: awsProfile,
          region: awsRegion,
          root: 'apps/proj',
          sourceRoot: 'apps/proj/src',
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
})
