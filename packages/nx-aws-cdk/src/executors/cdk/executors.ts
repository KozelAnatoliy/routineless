import { ExecutorContext, logger } from '@nx/devkit'
import { ChildProcess, spawn } from 'child_process'
import * as path from 'path'

import type { ParsedCdkExecutorOption } from '.'

const optionsShortNemingMapping: Record<string, string> = {
  a: 'app',
  c: 'context',
  p: 'plugin',
  j: 'json',
  v: 'verbose',
  i: 'ec2creds',
  r: 'role-arn',
  o: 'output',
  h: 'help',
}

export interface Command {
  command: string
  cwd?: string
}

interface CdkCommand extends Command {
  cdkCommand: string
}

export const createCommands = (options: ParsedCdkExecutorOption, context: ExecutorContext): Command[] => {
  logger.debug('Cdk executor options %s', JSON.stringify(options))
  const NX_WORKSPACE_ROOT = process.env['NX_WORKSPACE_ROOT']
  if (!NX_WORKSPACE_ROOT) {
    throw new Error('CDK not Found')
  }
  let baseExecutionCommand =
    options.env !== 'local'
      ? `AWS_ENV=${options.env} node ${NX_WORKSPACE_ROOT}/node_modules/aws-cdk/bin/cdk.js ${options.command}`
      : `AWS_ENV=${options.env} node ${NX_WORKSPACE_ROOT}/node_modules/aws-cdk-local/bin/cdklocal ${options.command}`

  if (options.account) {
    baseExecutionCommand = `AWS_ACCOUNT=${options.account} ${baseExecutionCommand}`
  }
  if (options.region) {
    baseExecutionCommand = `AWS_REGION=${options.region} ${baseExecutionCommand}`
  }

  const commandOptions = getCommandOptions(options)

  const executionCommand: CdkCommand = {
    cdkCommand: options.command,
    command: [baseExecutionCommand, ...commandOptions].join(' '),
    cwd: options.cwd || path.join(context.root, options.root),
  }
  const resultCommands: Command[] = []

  if (options.watch) {
    if (executionCommand.cdkCommand === 'deploy') {
      executionCommand.command = `${executionCommand.command} --watch`
      let providedStacks = options.parsedArgs['_']
      providedStacks = Array.isArray(providedStacks) ? providedStacks : []
      //Watch command will just hang without warnings if no stacks provided and --all flag is not provided
      //so setting --all flag by default in this case
      if (!providedStacks.length && !options.parsedArgs['all']) {
        executionCommand.command = `${executionCommand.command} --all`
      }
    }
    resultCommands.push(createProjectWatchCommand(context, options, executionCommand))
  }
  resultCommands.push(executionCommand)

  return resultCommands
}

const createProjectWatchCommand = (
  context: ExecutorContext,
  options: ParsedCdkExecutorOption,
  executionCommand: CdkCommand,
): Command => {
  return {
    command: `npx nx watch --projects=${context.projectName} -d -- "nx build ${context.projectName}${
      executionCommand.cdkCommand !== 'deploy'
        ? ` && (cd ${context.root}/${options.root} && ${executionCommand.command})`
        : ''
    }"`,
  }
}

const getCommandOptions = (options: ParsedCdkExecutorOption): string[] => {
  const commandArgs: string[] = []
  for (const argKey in options.parsedArgs) {
    const argValue = options.parsedArgs[argKey]
    if (Array.isArray(argValue)) {
      argValue.forEach((value) => {
        commandArgs.push(parsedArgToString(argKey, value))
      })
    } else if (argValue) {
      commandArgs.push(parsedArgToString(argKey, argValue))
    }
  }

  return commandArgs
}

const parsedArgToString = (key: string, value: string | boolean): string => {
  if (key === '_') {
    return `${value}`
  }
  const mappedKey = optionsShortNemingMapping[key] || key
  return `--${mappedKey} ${value}`
}

export const runCommandsInParralel = async (commands: Command[]): Promise<ProcessExitInfo[]> => {
  const promises = commands.map(({ command, cwd }) => runCommand(command, cwd))
  return Promise.all(promises)
}

export const runCommand = async (command: string, cwd?: string): Promise<ProcessExitInfo> => {
  logger.debug(`Executing command: ${command}`)
  logger.debug(`Working directory: ${cwd}`)

  const childProcess = spawn(command, {
    shell: true,
    env: process.env,
    cwd: cwd,
    stdio: [process.stdin, process.stdout, process.stderr],
  })

  const processExitListener = () => childProcess.kill()
  process.on('exit', processExitListener)
  process.on('SIGTERM', processExitListener)

  return onExit(childProcess, processExitListener)
}

const onExit = (childProcess: ChildProcess, processExitListener: () => boolean): Promise<ProcessExitInfo> => {
  return new Promise((resolve, reject) => {
    // I wanted to debug what command was finished here, maybe I can use childProcess to get this info
    // othervise I will propagate command to this function
    const exitHandler = (code: number, signal: NodeJS.Signals | null) => {
      logger.debug(`Finished ${childProcess.spawnargs.join(' ')} command execution: ${code}, ${signal}`)
      process.removeListener('exit', processExitListener)

      if (code === 0) {
        resolve({ code, signal })
      } else if (!code) {
        reject(new Error(`Exit with signal: ${signal}`))
      } else {
        reject(new Error(`Exit with error code: ${code}`))
      }
    }
    childProcess.once('close', exitHandler)
    childProcess.once('error', (err: Error) => {
      process.removeListener('exit', processExitListener)
      reject(err)
    })
  })
}

export interface ProcessExitInfo {
  code: number
  signal: NodeJS.Signals | null
}
