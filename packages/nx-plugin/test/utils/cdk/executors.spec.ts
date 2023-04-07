import { logger } from '@nrwl/devkit'
import type { ParsedCdkExecutorOption } from '@routineless/nx-plugin/executors/cdk'
import * as child_process from 'child_process'

import { createCommand, runCommandProcess } from '../../../src/utils/cdk/executors'
import { MockChildProcess, mockChildProcess } from '../../helpers/executor'

jest.mock('child_process')

describe('executors', () => {
  describe('createCommand', () => {
    const nxWorkspaceRoot = 'nxWorkspaceRoot'
    const testOptions: ParsedCdkExecutorOption = {
      command: 'diff',
      root: 'testRoot',
      sourceRoot: 'testSourceRoot',
      parsedArgs: {},
    }

    beforeEach(() => {
      process.env['NX_WORKSPACE_ROOT'] = nxWorkspaceRoot
    })

    it('should fail if nx workspace is not defined', () => {
      process.env['NX_WORKSPACE_ROOT'] = ''

      const commandCreationFunction = () => createCommand(testOptions)

      expect(commandCreationFunction).toThrow('CDK not Found')
    })

    it('should append parsedArgs', () => {
      const commandResult = createCommand({
        ...testOptions,
        parsedArgs: {
          _: ['FirstStack', 'SecondStack'],
          profile: 'local',
          j: true,
          c: ['firstContext', 'secondContext'],
          v: true,
        },
      })

      expect(commandResult).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true',
      )
    })
  })

  describe('runCommandProcess', () => {
    const command = 'testCommand'
    const cwd = 'cwd'
    let mockProcess: MockChildProcess

    beforeEach(async () => {
      jest.spyOn(logger, 'debug')
      mockProcess = mockChildProcess()
      jest.spyOn(child_process, 'spawn').mockReturnValueOnce(mockProcess)
    })

    it('should start execution with provided command', async () => {
      const executionProcess = runCommandProcess(command, cwd)
      mockProcess.emit('exit', 0)
      await executionProcess

      expect(child_process.spawn).toHaveBeenCalledWith(
        command,
        expect.objectContaining({
          env: process.env,
          shell: true,
          cwd: cwd,
          stdio: [process.stdin, process.stdout, process.stderr],
        }),
      )
      expect(logger.debug).toHaveBeenNthCalledWith(1, `Executing command: ${command}`)
    })

    it('should reject on nonzero exit code', async () => {
      const exitCode = 1
      const executionProcess = runCommandProcess(command, cwd)
      mockProcess.emit('exit', exitCode)

      expect(executionProcess).rejects.toEqual(`Exit with error code: ${exitCode}`)
    })

    it('should reject on error', async () => {
      const error = new Error('test error')
      const executionProcess = runCommandProcess(command, cwd)
      mockProcess.emit('error', error)

      expect(executionProcess).rejects.toEqual(error)
    })
  })
})
