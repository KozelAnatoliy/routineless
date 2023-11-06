import { ExecutorContext, logger } from '@nx/devkit'
import events from 'events'
import fs from 'fs'

import executor, { DockerPsOuptutEntry, isRunning } from '.'
import { ProcessExitInfo, runCommand } from '../../utils/executors'
import { mockExecutorContext } from '../../utils/testing/executor'
import type { LocalstackExecutorOptions } from './schema'

jest.mock('../../utils/executors')
jest.mock('fs')
jest.mock('events')

const mockedRunCommand = jest.mocked(runCommand, { shallow: true })
const mockedFs = jest.mocked(fs, { shallow: true })
const mockedEvents = jest.mocked(events, { shallow: true })

describe('localstack executor', () => {
  let context: ExecutorContext
  const testProcessExitInfo: ProcessExitInfo = { code: 0, signal: null }
  const expectedDockerFilePath =
    '/node_modules/@routineless/nx-aws-cdk/src/executors/localstack/docker/docker-compose.yaml'

  beforeEach(async () => {
    jest.spyOn(logger, 'error')
    context = mockExecutorContext('localstack')
    mockedRunCommand.mockResolvedValue(testProcessExitInfo)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should run localstack start command', async () => {
    const executionPrommise = executor({ command: 'start' }, context)
    const executionResult = await executionPrommise

    expect(mockedRunCommand).toHaveBeenCalledWith({
      command: `docker compose -f ${context.root}${expectedDockerFilePath} up --wait`,
    })
    expect(executionResult).toEqual({ success: true })
  })

  it('should run localstack stop command', async () => {
    const executionPrommise = executor({ command: 'stop' }, context)
    const executionResult = await executionPrommise

    expect(mockedRunCommand).toHaveBeenCalledWith({
      command: `docker compose -f ${context.root}${expectedDockerFilePath} down -v`,
    })
    expect(executionResult).toEqual({ success: true })
  })

  it('should preserve localstack volume with preserve flag', async () => {
    const executionPrommise = executor({ command: 'stop', preserveVolumes: true }, context)
    const executionResult = await executionPrommise

    expect(mockedRunCommand).toHaveBeenCalledWith({
      command: `docker compose -f ${context.root}${expectedDockerFilePath} stop`,
    })
    expect(executionResult).toEqual({ success: true })
  })

  it('should run localstack ps command', async () => {
    const executionPrommise = executor({ command: 'ps' }, context)
    const executionResult = await executionPrommise

    expect(mockedRunCommand).toHaveBeenCalledWith({
      command: `docker compose -f ${context.root}${expectedDockerFilePath} ps --format json`,
    })
    expect(executionResult).toEqual({ success: true })
  })

  it('should provide passed parameters as env variables', async () => {
    const options: LocalstackExecutorOptions = {
      command: 'start',
      debug: true,
      containerName: 'container-name',
      volumeMountPath: '/tmp',
    }
    const executionPrommise = executor(options, context)
    const executionResult = await executionPrommise

    expect(mockedRunCommand).toHaveBeenCalledWith({
      command: `LOCALSTACK_VOLUME_DIR=${options.volumeMountPath} LOCALSTACK_DOCKER_NAME=${options.containerName} DEBUG=1 docker compose -f ${context.root}${expectedDockerFilePath} up --wait`,
    })
    expect(executionResult).toEqual({ success: true })
  })

  it('should fail if command fails', async () => {
    const error = new Error('Error')
    mockedRunCommand.mockRejectedValue(error)

    const executionPrommise = executor({ command: 'start' }, context)
    const executionResult = await executionPrommise

    expect(logger.error).toHaveBeenLastCalledWith(`Failed to execute command: ${error}`)
    expect(executionResult).toEqual({ success: false })
  })

  describe('isRunning', () => {
    const isRunningJson: DockerPsOuptutEntry = {
      ID: 'id',
      Name: 'localstack_main',
      Image: 'localstack/localstack',
      State: 'running',
      Status: 'Up 2 minutes (healthy)',
      Health: 'healthy',
    }
    const isNotRunningJson: DockerPsOuptutEntry = {
      ...isRunningJson,
      State: 'exited',
      Health: '',
    }

    beforeEach(() => {
      mockedEvents.once.mockResolvedValueOnce([])
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.createWriteStream.mockReturnValue({ close: jest.fn() } as any)
      mockedFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify([isRunningJson])))
      mockedRunCommand.mockResolvedValue(testProcessExitInfo)
    })

    it('should return true if localstack is running', async () => {
      const result = await isRunning(context)

      expect(result).toBe(true)
    })

    it('should retrun false if localstack is in exited state', async () => {
      mockedFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify([isNotRunningJson])))

      const result = await isRunning(context)

      expect(result).toBe(false)
    })

    it('should return false if localstack is not in the list', async () => {
      mockedFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify([])))

      const result = await isRunning(context)

      expect(result).toBe(false)
    })

    it('should return false if failed to parse docker ps output', async () => {
      mockedFs.readFileSync.mockReturnValue(Buffer.from('invalid json'))

      const result = await isRunning(context)

      expect(result).toBe(false)
    })
  })
})
