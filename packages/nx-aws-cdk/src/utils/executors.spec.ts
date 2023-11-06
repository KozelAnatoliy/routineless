import { logger } from '@nx/devkit'
import * as child_process from 'child_process'

import { Command, Stdio, runCommand, runCommandsInParralel } from './executors'
import { MockChildProcess, mockChildProcess } from './testing/executor'

jest.mock('child_process')

describe('executors', () => {
  describe('runCommand', () => {
    const excutionCommand: Command = { command: 'testCommand', cwd: 'cwd' }
    let mockProcess: MockChildProcess

    beforeEach(async () => {
      jest.spyOn(logger, 'debug')
      mockProcess = mockChildProcess()
      jest.spyOn(child_process, 'spawn').mockReturnValueOnce(mockProcess)
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should start execution with provided command', async () => {
      const executionProcess = runCommand(excutionCommand)
      mockProcess.emit('close', 0)
      await executionProcess

      expect(child_process.spawn).toHaveBeenCalledWith(
        excutionCommand.command,
        expect.objectContaining({
          env: process.env,
          shell: true,
          cwd: excutionCommand.cwd,
          stdio: [process.stdin, process.stdout, process.stderr],
        }),
      )
      expect(logger.debug).toHaveBeenCalledWith(`Executing command: ${excutionCommand.command}`)
    })

    it('should pass provided stdio', async () => {
      const stdio: [Stdio, Stdio, Stdio] = ['ignore', 'ignore', 'ignore']

      const executionProcess = runCommand(excutionCommand, { stdio })
      mockProcess.emit('close', 0)
      await executionProcess

      expect(child_process.spawn).toHaveBeenCalledWith(
        excutionCommand.command,
        expect.objectContaining({
          env: process.env,
          shell: true,
          cwd: excutionCommand.cwd,
          stdio,
        }),
      )
    })

    it('should reject on nonzero exit code', async () => {
      const exitCode = 1
      const executionProcess = runCommand(excutionCommand)
      mockProcess.emit('close', exitCode)

      await expect(executionProcess).rejects.toThrow(`Exit with error code: ${exitCode}`)
    })

    it('should reject on error', async () => {
      const error = new Error('test error')
      const executionProcess = runCommand(excutionCommand)
      mockProcess.emit('error', error)

      await expect(executionProcess).rejects.toEqual(error)
    })

    it('should reject on signal', async () => {
      const signal = 'SIGTERM'
      const executionProcess = runCommand(excutionCommand)
      mockProcess.emit('close', null, signal)

      await expect(executionProcess).rejects.toThrow(`Exit with signal: ${signal}`)
    })
  })

  describe('runCommandsInParralel', () => {
    const commands = [{ command: 'testCommand1', cwd: 'root' }, { command: 'testCommand2' }]
    let mockFirstProcess: MockChildProcess
    let mockSecondProcess: MockChildProcess

    beforeEach(async () => {
      jest.spyOn(logger, 'debug')
      mockFirstProcess = mockChildProcess()
      mockSecondProcess = mockChildProcess()
      jest.spyOn(child_process, 'spawn').mockReturnValueOnce(mockFirstProcess)
      jest.spyOn(child_process, 'spawn').mockReturnValueOnce(mockSecondProcess)
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should run commands in parrall', async () => {
      const executionProcess = runCommandsInParralel(commands)
      mockFirstProcess.emit('close', 0)
      mockSecondProcess.emit('close', 0)
      await executionProcess

      expect(child_process.spawn).toHaveBeenCalledWith(
        commands[0]?.command,
        expect.objectContaining({
          env: process.env,
          shell: true,
          cwd: commands[0]?.cwd,
          stdio: [process.stdin, process.stdout, process.stderr],
        }),
      )
      expect(child_process.spawn).toHaveBeenCalledWith(
        commands[1]?.command,
        expect.objectContaining({
          env: process.env,
          shell: true,
          cwd: commands[1]?.cwd,
          stdio: [process.stdin, process.stdout, process.stderr],
        }),
      )
      expect(logger.debug).toHaveBeenCalledWith(`Executing command: ${commands[0]?.command}`)
      expect(logger.debug).toHaveBeenCalledWith(`Executing command: ${commands[1]?.command}`)
    })
  })
})
