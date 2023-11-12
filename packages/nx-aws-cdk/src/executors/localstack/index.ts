import type { ExecutorContext } from '@nx/devkit'
import events from 'events'
import fs from 'fs'

import { Command, runCommand } from '../../utils/executors'
import { logger } from '../../utils/logger'
import type { LocalstackExecutorOptions } from './schema'

export const TARGET_NAME = 'localstack'

export interface DockerPsOuptutEntry {
  ID: string
  Name: string
  Image: string
  State: string
  Health: string
  Status: string
}

export const isRunning = async (context: ExecutorContext): Promise<boolean> => {
  const command = buildCommand({ command: 'ps' }, context)
  const tmpLogsPath = `${context.root}/tmp/docker-localstack-ps-log.json`

  if (fs.existsSync(tmpLogsPath)) {
    fs.rmSync(tmpLogsPath)
  }
  const logStream = fs.createWriteStream(tmpLogsPath)
  await events.once(logStream, 'open')
  await runCommand(command, { stdio: [process.stdin, logStream, process.stderr] })
  logStream.close()
  const logsContent = fs.readFileSync(tmpLogsPath)
  try {
    const dockerPsOutput: DockerPsOuptutEntry[] = JSON.parse(logsContent.toString())
    for (const container of dockerPsOutput) {
      if (container.Image === 'localstack/localstack' && container.State === 'running') {
        return true
      }
    }
  } catch (e) {
    logger.error(`Failed to parse docker ps output: ${e}`)
    return false
  }
  return false
}

const buildCommand = (options: LocalstackExecutorOptions, context: ExecutorContext): Command => {
  const pluginPath = `${context.root}/node_modules/@routineless/nx-aws-cdk`
  const executorPath = `${pluginPath}/src/executors/localstack`
  const dockerComposeFilePath = `${executorPath}/docker/docker-compose.yaml`
  let command = `docker compose -f ${dockerComposeFilePath}`
  switch (options.command) {
    case 'start':
      command = `${command} up --wait`
      break
    case 'stop':
      if (!options.preserveVolumes) {
        command = `${command} down -v`
      } else {
        command = `${command} stop`
      }
      break
    case 'ps':
      command = `${command} ps --format json`
      break
  }
  if (options.debug) {
    command = `DEBUG=1 ${command}`
  }
  if (options.containerName) {
    command = `LOCALSTACK_DOCKER_NAME=${options.containerName} ${command}`
  }
  if (options.volumeMountPath) {
    command = `LOCALSTACK_VOLUME_DIR=${options.volumeMountPath} ${command}`
  }

  return { command: command }
}

const localstackExecutor = async (
  options: LocalstackExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> => {
  logger.debug('Localstack executor options %s', JSON.stringify(options))
  const command: Command = buildCommand(options, context)
  try {
    await runCommand(command)
    return {
      success: true,
    }
  } catch (e) {
    logger.error(`Failed to execute command: ${e}`)
    return {
      success: false,
    }
  }
}

export default localstackExecutor
