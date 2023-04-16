import { logger } from '@nrwl/devkit'
import { ChildProcess, spawn } from 'child_process'

import type { ParsedCdkExecutorOption } from '../../executors/cdk'

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

export const createCommand = (options: ParsedCdkExecutorOption): string => {
  logger.debug('Cdk executor options %s', JSON.stringify(options))
  const NX_WORKSPACE_ROOT = process.env['NX_WORKSPACE_ROOT']
  if (!NX_WORKSPACE_ROOT) {
    throw new Error('CDK not Found')
  }
  const baseExecutionCommand = `node ${NX_WORKSPACE_ROOT}/node_modules/aws-cdk/bin/cdk.js ${options.command}`
  const commandOptions = getCommandOptions(options)

  const resultCommand = [baseExecutionCommand, ...commandOptions].join(' ')

  return resultCommand
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

export const runCommandProcess = async (command: string, cwd: string): Promise<ProcessExitInfo> => {
  logger.debug(`Executing command: ${command}`)

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
    const exitHandler = (code: number, signal: NodeJS.Signals | null) => {
      logger.debug(`Finished command execution: ${code}, ${signal}`)
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
