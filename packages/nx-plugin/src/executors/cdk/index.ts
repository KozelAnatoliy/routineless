import type { ExecutorContext } from '@nrwl/devkit'
import { logger } from '@nrwl/devkit'
import * as path from 'path'
import parser from 'yargs-parser'

import { createCommand, runCommandProcess } from '../../utils/cdk/executors'
import type { CdkExecutorOptions } from './schema'

export interface ParsedCdkExecutorOption extends CdkExecutorOptions {
  parsedArgs: { [k: string]: string | string[] | boolean }
  root: string
  sourceRoot: string
  env: string
}

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
  const command = createCommand(normalizedOptions)
  try {
    await runCommandProcess(command, normalizedOptions.cwd || path.join(context.root, normalizedOptions.root))
    return {
      success: true,
    }
  } catch (e) {
    logger.error(`Failed to execute command ${command}: ${e}`)
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
