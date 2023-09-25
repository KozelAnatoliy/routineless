import type { ExecutorContext } from '@nx/devkit'
import { logger } from '@nx/devkit'
import parser from 'yargs-parser'

import { createCommands, runCommandsInParralel } from './executors'
import type { CdkExecutorOptions } from './schema'

export interface ParsedCdkExecutorOption extends CdkExecutorOptions {
  parsedArgs: { [k: string]: string | string[] | boolean }
  root: string
  sourceRoot: string
  env: string
}

// Do not add watch argument to this list so it will be processed as command argument
const executorPropKeys = ['args', 'command', 'cwd', 'env']

const normalizeOptions = (options: CdkExecutorOptions, context: ExecutorContext): ParsedCdkExecutorOption => {
  if (!context.projectName) {
    throw new Error('Cdk bootstrap executor should be executed on cdk project')
  }
  const projectConfig = context.projectsConfigurations?.projects[context.projectName]
  if (!projectConfig) {
    throw new Error(`Cdk bootstrap failed. Failed to read project configuration for ${context.projectName}`)
  }
  const { sourceRoot, root } = projectConfig
  if (!sourceRoot) {
    throw new Error(`Cdk bootstrap failed. Failed to read source root for ${context.projectName}`)
  }
  // unwrap cdk watch alias to handle nx watch properly
  if (options.watch && options.command != 'deploy') {
    options.watch = false
  }
  if (options.command == 'watch') {
    options.command = 'deploy'
    options.watch = true
  }
  const parsedArgs = parseArgs(options)
  return {
    ...options,
    env: process.env['AWS_ENV'] || 'local',
    sourceRoot,
    root,
    parsedArgs,
  }
}

const runExecutor = async (options: CdkExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  const normalizedOptions = normalizeOptions(options, context)
  const commands = createCommands(normalizedOptions, context)
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

const parseArgs = (options: CdkExecutorOptions): Record<string, string | string[] | boolean> => {
  let parsedArgs = {}
  if (options.args) {
    parsedArgs = parser(options.args.replace(/(^"|"$)/g, ''), {
      configuration: { 'camel-case-expansion': false },
    })
  }
  const keys = Object.keys(options)
  const unknownOptionsTreatedAsArgs = keys
    .filter((p) => executorPropKeys.indexOf(p) === -1)
    .reduce((acc, key) => {
      const optionValue = options[key]
      if ((optionValue && typeof optionValue !== 'object') || Array.isArray(optionValue)) {
        acc[key] = optionValue
      }
      return acc
    }, {} as Record<string, string | string[] | boolean>)
  return { ...parsedArgs, ...unknownOptionsTreatedAsArgs }
}

export default runExecutor
