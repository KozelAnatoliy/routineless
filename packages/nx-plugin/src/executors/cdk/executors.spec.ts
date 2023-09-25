import { logger } from '@nx/devkit'
import * as child_process from 'child_process'

import type { ParsedCdkExecutorOption } from '../../executors/cdk'
import { MockChildProcess, mockChildProcess, mockExecutorContext } from '../../utils/testing/executor'
import { createCommands, runCommand, runCommandsInParralel } from './executors'

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
    const executorContext = mockExecutorContext('cdk')

    beforeEach(() => {
      process.env['NX_WORKSPACE_ROOT'] = nxWorkspaceRoot
    })

    it('should fail if nx workspace is not defined', () => {
      process.env['NX_WORKSPACE_ROOT'] = ''

      const commandCreationsFunction = () => createCommands(testOptions, executorContext)

      expect(commandCreationsFunction).toThrow('CDK not Found')
    })

    it('should append parsedArgs with short names', () => {
      const commandResult = createCommands(
        {
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
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(1)
      expect(commandResult[0]?.command).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true' +
          ' --app testApp --plugin testPlugin --ec2creds testEc2Creds --role-arn testRoleArn --output testOutput --help true',
      )
      expect(commandResult[0]?.cwd).toEqual('/root/testRoot')
    })

    it('should append parsedArgs with long names', () => {
      const commandResult = createCommands(
        {
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
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(1)
      expect(commandResult[0]?.command).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true' +
          ' --app testApp --plugin testPlugin --ec2creds testEc2Creds --role-arn testRoleArn --output testOutput --help true',
      )
    })

    it('should append unknown parsedArgs', () => {
      const commandResult = createCommands(
        {
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
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(1)
      expect(commandResult[0]?.command).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
          ' --profile local --json true --context firstContext --context secondContext --verbose true' +
          ' --app testApp --plugin testPlugin --ec2creds testEc2Creds --role-arn testRoleArn --output testOutput --help true' +
          ' --unknown unknown',
      )
    })

    it('should use cdk local for local env', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          env: 'local',
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(1)
      expect(commandResult[0]?.command).toEqual('node nxWorkspaceRoot/node_modules/aws-cdk-local/bin/cdklocal diff')
    })

    it('should run proj watch task with watch arg provided', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          parsedArgs: {
            watch: true,
          },
          watch: true,
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(2)
      expect(commandResult[0]?.command).toEqual(
        'node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff --watch true',
      )
      expect(commandResult[0]?.cwd).toEqual('/root/testRoot')
      expect(commandResult[1]?.command).toEqual(
        `npx nx watch --projects=${executorContext.projectName} -d -- "nx build ${executorContext.projectName}"`,
      )
      expect(commandResult[1]?.cwd).toBeUndefined()
    })
  })

  describe('runCommand', () => {
    const command = 'testCommand'
    const cwd = 'cwd'
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
      const executionProcess = runCommand(command, cwd)
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
      expect(logger.debug).toHaveBeenCalledWith(`Executing command: ${command}`)
    })

    it('should reject on nonzero exit code', async () => {
      const exitCode = 1
      const executionProcess = runCommand(command, cwd)
      mockProcess.emit('close', exitCode)

      await expect(executionProcess).rejects.toThrow(`Exit with error code: ${exitCode}`)
    })

    it('should reject on error', async () => {
      const error = new Error('test error')
      const executionProcess = runCommand(command, cwd)
      mockProcess.emit('error', error)

      await expect(executionProcess).rejects.toEqual(error)
    })

    it('should reject on signal', async () => {
      const signal = 'SIGTERM'
      const executionProcess = runCommand(command, cwd)
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
