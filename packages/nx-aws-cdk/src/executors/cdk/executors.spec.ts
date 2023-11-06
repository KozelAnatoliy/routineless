import type { ParsedCdkExecutorOption } from '../../executors/cdk'
import { mockExecutorContext } from '../../utils/testing/executor'
import { createCommands } from './executors'

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
      projectName: 'testProject',
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
        'AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
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
        'AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
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
        'AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff FirstStack SecondStack' +
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
      expect(commandResult[0]?.command).toEqual(
        'AWS_ENV=local node nxWorkspaceRoot/node_modules/aws-cdk-local/bin/cdklocal diff',
      )
    })

    it('should run proj watch task with watch arg provided', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          parsedArgs: {},
          watch: true,
          cwd: 'cwd',
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(2)
      expect(commandResult[0]?.command).toEqual(
        `npx nx watch --projects=${executorContext.projectName} -d -- "nx build ${executorContext.projectName} && (cd ${executorContext.root}/${testOptions.root} && AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff)"`,
      )
      expect(commandResult[0]?.cwd).toBeUndefined()
      expect(commandResult[1]?.command).toEqual('AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff')
      expect(commandResult[1]?.cwd).toEqual('cwd')
    })

    it('should provide watch option to deploy task and skip adding deploy task to nx watch command', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          command: 'deploy',
          parsedArgs: {},
          watch: true,
          cwd: 'cwd',
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(2)
      expect(commandResult[0]?.command).toEqual(
        `npx nx watch --projects=${executorContext.projectName} -d -- "nx build ${executorContext.projectName}"`,
      )
      expect(commandResult[0]?.cwd).toBeUndefined()
      expect(commandResult[1]?.command).toEqual(
        'AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js deploy --watch --all',
      )
      expect(commandResult[1]?.cwd).toEqual('cwd')
    })

    it('should not add --all flag to deploy watch command if stacks were provided', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          command: 'deploy',
          parsedArgs: {
            _: ['FirstStack', 'SecondStack'],
          },
          watch: true,
          cwd: 'cwd',
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(2)
      expect(commandResult[0]?.command).toEqual(
        `npx nx watch --projects=${executorContext.projectName} -d -- "nx build ${executorContext.projectName}"`,
      )
      expect(commandResult[0]?.cwd).toBeUndefined()
      expect(commandResult[1]?.command).toEqual(
        'AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js deploy FirstStack SecondStack --watch',
      )
      expect(commandResult[1]?.cwd).toEqual('cwd')
    })

    it('should not append deploy watch flag if it was already provided in options', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          command: 'deploy',
          parsedArgs: {
            all: true,
          },
          watch: true,
          cwd: 'cwd',
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(2)
      expect(commandResult[0]?.command).toEqual(
        `npx nx watch --projects=${executorContext.projectName} -d -- "nx build ${executorContext.projectName}"`,
      )
      expect(commandResult[0]?.cwd).toBeUndefined()
      expect(commandResult[1]?.command).toEqual(
        'AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js deploy --all true --watch',
      )
      expect(commandResult[1]?.cwd).toEqual('cwd')
    })

    it('should append aws account details if provided', () => {
      const commandResult = createCommands(
        {
          ...testOptions,
          account: 'account',
          region: 'region',
        },
        executorContext,
      )

      expect(commandResult.length).toEqual(1)
      expect(commandResult[0]?.command).toEqual(
        'AWS_REGION=region AWS_ACCOUNT=account AWS_ENV=dev node nxWorkspaceRoot/node_modules/aws-cdk/bin/cdk.js diff',
      )
    })
  })
})
