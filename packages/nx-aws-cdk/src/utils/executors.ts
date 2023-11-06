import { logger } from '@nx/devkit'
import { ChildProcess, spawn } from 'child_process'
import { Stream } from 'stream'

export type Stdio = 'inherit' | 'ignore' | Stream | 'pipe' | 'overlapped' | undefined | null

export interface CommandOptions {
  // [stdin, stdout, stderr]
  stdio?: [Stdio, Stdio, Stdio]
}

export interface Command {
  command: string
  cwd?: string
}

export interface ProcessExitInfo {
  code: number
  signal: NodeJS.Signals | null
}

export const runCommandsInParralel = async (commands: Command[]): Promise<ProcessExitInfo[]> => {
  const promises = commands.map((command) => runCommand(command))
  return Promise.all(promises)
}

export const runCommand = async (executionCommand: Command, options?: CommandOptions): Promise<ProcessExitInfo> => {
  const { command, cwd } = executionCommand
  logger.debug(`Executing command: ${command}`)
  if (cwd) {
    logger.debug(`Working directory: ${cwd}`)
  }

  let stdio: [Stdio, Stdio, Stdio] = [process.stdin, process.stdout, process.stderr]
  if (options?.stdio) {
    stdio = options.stdio
  }
  const childProcess = spawn(command, {
    shell: true,
    env: process.env,
    cwd: cwd,
    stdio: stdio,
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
