import { names } from '@nx/devkit'
import {
  checkFilesExist,
  ensureNxProject,
  patchPackageJsonForPlugin,
  runCommandAsync,
  runNxCommandAsync,
  runPackageManagerInstall,
  uniq,
} from '@nx/plugin/testing'

describe('cdk application', () => {
  const infraProject = uniq('infra')
  const lambdaProject = uniq('lambda')
  const OLD_ENV = process.env

  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(async () => {
    ensureNxProject('@routineless/nx-aws-cdk', 'dist/packages/nx-aws-cdk')
    patchPackageJsonForPlugin('@routineless/cdk', 'dist/packages/cdk')
    runPackageManagerInstall()
    await runNxCommandAsync(`generate @routineless/nx-aws-cdk:preset -i ${infraProject} -l ${lambdaProject}`)
  })

  afterAll(async () => {
    await runNxCommandAsync(`localstack ${infraProject} stop`)
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset')
  })

  beforeEach(() => {
    // CDK outputs to stderr by default https://github.com/aws/aws-cdk/issues/7717
    // it was done to make logs colorized. It might be swithed off by setting CI env variable
    process.env = { ...OLD_ENV, CI: 'true' }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  describe('nx-aws-cdk preset', () => {
    it('should create infra application', () => {
      expect(() => checkFilesExist(`apps/${infraProject}`)).not.toThrow()
    })

    it('should create lambda application', () => {
      expect(() => checkFilesExist(`apps/${lambdaProject}`)).not.toThrow()
    })

    it('should remove redundant files', () => {
      expect(() => checkFilesExist('apps/.gitkeep')).toThrow()
    })

    it('should add lambda function to infra app', async () => {
      process.env['ROUTINELESS_LOG_LEVEL'] = 'debug'
      const result = await runNxCommandAsync(`run ${infraProject}:cdk diff`)

      const { className } = names(lambdaProject)
      expect(result.stdout).toContain('debug: Cdk executor options {"_":["diff"],"command":"diff"')
      expect(result.stdout).toContain('debug: Finished /bin/sh -c AWS_ENV=local')
      expect(result.stdout).toContain(`[+] AWS::Lambda::Function ${className}Function`)
      expect(result.stdout).toContain('debug: Finished /bin/sh -c AWS_ENV=local')
    })
  })

  describe('cdk application generator', () => {
    const project = uniq('cdk')

    beforeAll(async () => {
      await runNxCommandAsync(`generate cdk-application ${project}`)
    })

    it('should generate cdk files', () => {
      expect(() => checkFilesExist(`apps/${project}/cdk.json`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/main.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/stacks/persistance.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/stacks/persistance.spec.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/app`)).toThrow()
    })

    it('should run cdk diff', async () => {
      const result = await runNxCommandAsync(`run ${project}:cdk diff`)

      expect(result.stdout).not.toContain('debug: Cdk executor options')
      expect(result.stdout).not.toContain('debug: Finished /bin/sh -c AWS_ENV=local')
      expect(result.stdout).toContain('[+] AWS::S3::Bucket Bucket')
      expect(result.stdout).toContain(`Successfully ran target cdk for project ${project}`)
    })

    it('should have tests coverage', async () => {
      const result = await runNxCommandAsync(`test ${project} -- --codeCoverage=true --coverageReporters=text-summary`)

      expect(result.stdout).toContain('Statements   : 100%')
      expect(result.stdout).toContain('Branches     : 100%')
      expect(result.stdout).toContain('Functions    : 100%')
      expect(result.stdout).toContain('Lines        : 100%')
      expect(result.stdout).toContain(`Successfully ran target test for project ${project}`)
    })
  })

  describe('aws-lambda generator', () => {
    const project = uniq('aws-lambda')

    beforeAll(async () => {
      await runNxCommandAsync(`generate aws-lambda ${project}`)
    })

    it('should lambda generate files', () => {
      expect(() => checkFilesExist(`apps/${project}/project.json`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/runtime/main.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/runtime/main.spec.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/infra/index.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/infra/index.spec.ts`)).not.toThrow()
    })

    it('should run cdk diff', async () => {
      const { className } = names(project)

      const result = await runNxCommandAsync(`run ${infraProject}:cdk diff`)

      expect(result.stdout).toContain(`[+] AWS::Lambda::Function ${className}Function`)
      expect(result.stdout).toContain(`Successfully ran target cdk for project ${infraProject}`)
    })

    it('should deploy lambda', async () => {
      const { className, fileName } = names(project)

      await runNxCommandAsync(`run ${infraProject}:cdk bootstrap`)
      const deployResult = await runNxCommandAsync(
        `run ${infraProject}:cdk deploy ${className}StackLocal --require-approval never`,
      )
      expect(deployResult.stdout).toContain(`Successfully ran target cdk for project ${infraProject}`)

      await runCommandAsync(`awslocal lambda invoke --function-name ${className}Local ${fileName}-response.json`)
      const invokeResult = await runCommandAsync(`cat ${fileName}-response.json`)
      expect(invokeResult.stdout).toContain('Hello World')
      const destroyResult = await runNxCommandAsync(`run ${infraProject}:cdk destroy ${className}StackLocal -f`)
      expect(destroyResult.stdout).toContain(`${className}StackLocal: destroyed`)
    })

    it('should have tests coverage', async () => {
      const result = await runNxCommandAsync(`test ${project} -- --codeCoverage=true --coverageReporters=text-summary`)

      expect(result.stdout).toContain('Statements   : 100%')
      expect(result.stdout).toContain('Branches     : 100%')
      expect(result.stdout).toContain('Functions    : 100%')
      expect(result.stdout).toContain('Lines        : 100%')
      expect(result.stdout).toContain(`Successfully ran target test for project ${project}`)
    })
  })
})
