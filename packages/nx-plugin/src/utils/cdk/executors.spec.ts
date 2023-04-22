import { logger } from '@nrwl/devkit'
import * as child_process from 'child_process'

import type { ParsedCdkExecutorOption } from '../../executors/cdk'
import { MockChildProcess, mockChildProcess } from '../testing/executor'
import { createCommand, runCommandProcess } from './executors'

jest.mock('child_process')

describe('executors', () => {
  describe('createCommand', () => {
    const nxWorkspaceRoot = 'nxWorkspaceRoot'
    const testOptions: ParsedCdkExecutorOption = {
      command: 'diff',
      root: 'testRoot',
      sourceRoot: 'testSourceRoot',
      env: 'dev',
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

    it('should append parsedArgs with short names', () => {
      const commandResult = createCommand({
        ...testOptions,
        parsedArgs: {
          _: ['FirstStack', 'SecondStack'],
          profile: 'local',
          j: true,
          c: ['firstContext', 'secondContext'],
          v: true,
          a: 'testApp',
          p: 'testPlugin',
          i: 'testEc2Creds',
          r: 'testRoleArn',
          o: 'testOutput',
          h: true,
        },
      })

      expect(commandResult).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true' +
          ' --app testApp --plugin testPlugin --ec2creds testEc2Creds --role-arn testRoleArn --output testOutput --help true',
      )
    })

    it('should append parsedArgs with long names', () => {
      const commandResult = createCommand({
        ...testOptions,
        parsedArgs: {
          _: ['FirstStack', 'SecondStack'],
          profile: 'local',
          json: true,
          context: ['firstContext', 'secondContext'],
          verbose: true,
          app: 'testApp',
          plugin: 'testPlugin',
          ec2creds: 'testEc2Creds',
          'role-arn': 'testRoleArn',
          output: 'testOutput',
          help: true,
        },
      })

      expect(commandResult).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true' +
          ' --app testApp --plugin testPlugin --ec2creds testEc2Creds --role-arn testRoleArn --output testOutput --help true',
      )
    })

    it('should append unknown parsedArgs', () => {
      const commandResult = createCommand({
        ...testOptions,
        parsedArgs: {
          _: ['FirstStack', 'SecondStack'],
          profile: 'local',
          json: true,
          context: ['firstContext', 'secondContext'],
          verbose: true,
          app: 'testApp',
          plugin: 'testPlugin',
          ec2creds: 'testEc2Creds',
          'role-arn': 'testRoleArn',
          output: 'testOutput',
          help: true,
          unknown: 'unknown',
        },
      })

      expect(commandResult).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true' +
          ' --app testApp --plugin testPlugin --ec2creds testEc2Creds --role-arn testRoleArn --output testOutput --help true' +
          ' --unknown unknown',
      )
    })

    it('should use cdk local for local env', () => {
      const commandResult = createCommand({
        ...testOptions,
        env: 'local',
      })

      expect(commandResult).toEqual('node nxWorkspaceRoot/node_modules/aws-cdk-local/bin/cdklocal diff')
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
      mockProcess.emit('close', 0)
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
      mockProcess.emit('close', exitCode)

      await expect(executionProcess).rejects.toThrow(`Exit with error code: ${exitCode}`)
    })

    it('should reject on error', async () => {
      const error = new Error('test error')
      const executionProcess = runCommandProcess(command, cwd)
      mockProcess.emit('error', error)

      await expect(executionProcess).rejects.toEqual(error)
    })

    it('should reject on signal', async () => {
      const signal = 'SIGTERM'
      const executionProcess = runCommandProcess(command, cwd)
      mockProcess.emit('close', null, signal)

      await expect(executionProcess).rejects.toThrow(`Exit with signal: ${signal}`)
    })
  })
})
