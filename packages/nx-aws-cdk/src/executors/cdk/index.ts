import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { fromNodeProviderChain, fromNodeProviderChainInit } from '@aws-sdk/credential-providers'
import { ExecutorContext, runExecutor } from '@nx/devkit'
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'

import { runCommandsInParralel } from '../../utils/executors'
import { logger } from '../../utils/logger'
import { TARGET_NAME as LOCALSTACK_TARGET_NAME, isRunning as isLocalstackRunning } from '../localstack'
import { createCommands } from './executors'
import type { CdkExecutorOptions } from './schema'

export interface ParsedCdkExecutorOption extends CdkExecutorOptions {
  parsedArgs: { [k: string]: string | string[] | boolean | undefined }
  command: string
  root: string
  sourceRoot: string
  env: string
  projectName: string
}

const executorPropKeys = ['cwd', 'env', 'account', 'region', 'watch', 'resolve']

const normalizeOptions = async (
  options: CdkExecutorOptions,
  context: ExecutorContext,
): Promise<ParsedCdkExecutorOption> => {
  if (!context.projectName) {
    throw new Error(`Cdk executor should be executed on cdk project. Provided project name: ${context.projectName}`)
  }
  const projectConfig = context.projectsConfigurations?.projects[context.projectName]
  if (!projectConfig) {
    throw new Error(`Cdk executor failed. Failed to read project configuration for ${context.projectName}`)
  }
  const { sourceRoot, root } = projectConfig
  if (!sourceRoot) {
    throw new Error(`Cdk executor failed. Failed to read source root for ${context.projectName}`)
  }

  const { command, parsedArgs } = parseArgs(options)
  if (!command) {
    throw new Error(`Cdk executor failed. Command is not provided`)
  }
  let finalCommand = command

  if (command == 'watch') {
    finalCommand = 'deploy'
    options.watch = true
  }

  parsedArgs['profile'] = parsedArgs['profile'] || process.env['AWS_PROFILE']
  let resolvedAccount: string | undefined = options.account || process.env['AWS_ACCOUNT']
  let resolvedRegion: string | undefined = options.region || process.env['AWS_REGION']
  if (options.resolve) {
    const profile = parsedArgs['profile']

    if (!resolvedRegion) {
      let regionResolutionError: unknown
      try {
        const awsConfig = await loadSharedConfigFiles()
        resolvedRegion =
          profile && typeof profile === 'string'
            ? awsConfig.configFile?.[profile]?.['region'] || awsConfig.configFile?.['default']?.['region']
            : awsConfig.configFile?.['default']?.['region']
      } catch (e: unknown) {
        regionResolutionError = e
        logger.warn(`Cannot resolve region. Failed to load aws config for profile ${profile}: ${e}`)
      } finally {
        if (!resolvedRegion && !regionResolutionError) {
          console.warn(`Failed to resolve region for profile ${profile}. Region is not configured in  aws config`)
        }
      }
    }

    if (!resolvedAccount) {
      if (resolvedRegion) {
        const init: fromNodeProviderChainInit = {}
        if (profile && typeof profile === 'string') {
          init.profile = profile
        }
        const awsCredentials = fromNodeProviderChain(init)
        const stsClient = new STSClient({ credentials: awsCredentials, region: resolvedRegion })
        try {
          const callerIdentity = await stsClient.send(new GetCallerIdentityCommand({}))
          resolvedAccount = callerIdentity.Account
        } catch (e) {
          logger.warn(`Cannot resolve account. Failed to get caller identity for profile ${profile}: ${e}`)
        }
      } else {
        logger.warn('Cannot resolve account. Region is not provided and cannot be resolved from aws config')
      }
    }
  }

  return {
    ...options,
    command: finalCommand,
    env: options.env || process.env['AWS_ENV'] || 'local',
    account: resolvedAccount,
    region: resolvedRegion,
    sourceRoot,
    root,
    parsedArgs,
    projectName: context.projectName,
  }
}

const cdkExecutor = async (options: CdkExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  const normalizedOptions = await normalizeOptions(options, context)
  const commands = createCommands(normalizedOptions, context)

  if (normalizedOptions.env === 'local' && !(await isLocalstackRunning(context))) {
    logger.info('Localstack is not running. Starting localstack')
    const localstackStartResult = await runExecutor(
      { project: normalizedOptions.projectName, target: LOCALSTACK_TARGET_NAME },
      { command: 'start' },
      context,
    )
    for await (const resolut of localstackStartResult) {
      if (!resolut.success) {
        logger.error('Failed to start localstack')
        return {
          success: false,
        }
      }
    }
  }

  try {
    await runCommandsInParralel(commands)
    return {
      success: true,
    }
  } catch (e) {
    logger.error(`Failed to execute commands ${JSON.stringify(commands)}: ${e}`)
    return {
      success: false,
    }
  }
}

const parseArgs = (
  options: CdkExecutorOptions,
): { command: string | undefined; parsedArgs: Record<string, string | string[] | boolean | undefined> } => {
  let command: string | undefined

  const keys = Object.keys(options)
  const parsedArgs = keys
    .filter((p) => executorPropKeys.indexOf(p) === -1)
    .reduce((acc, key) => {
      const optionValue = options[key]
      if ((optionValue && typeof optionValue !== 'object') || Array.isArray(optionValue)) {
        if (key === '_' && Array.isArray(optionValue) && optionValue.length) {
          command = optionValue[0]
          acc[key] = optionValue.slice(1)
        } else {
          acc[key] = optionValue
        }
      }
      return acc
    }, {} as Record<string, string | string[] | boolean>)
  return { command, parsedArgs }
}

export default cdkExecutor
