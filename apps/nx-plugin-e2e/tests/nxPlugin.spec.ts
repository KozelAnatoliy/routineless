import { names } from '@nrwl/devkit'
import { checkFilesExist, ensureNxProject, runNxCommandAsync, uniq } from '@nrwl/nx-plugin/testing'

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
    ensureNxProject('@routineless/nx-plugin', 'dist/packages/nx-plugin')
    await runNxCommandAsync(`generate @routineless/nx-plugin:preset -i ${infraProject} -l ${lambdaProject}`)
  })

  afterAll(async () => {
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

  describe('routineless preset', () => {
    it('should create infra application', () => {
      expect(() => checkFilesExist(`apps/${infraProject}`)).not.toThrow()
    })

    it('should create lambda application', () => {
      expect(() => checkFilesExist(`apps/${lambdaProject}/runtime`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${lambdaProject}/infra`)).not.toThrow()
    })

    it('should remove redundant files', () => {
      expect(() => checkFilesExist('apps/.gitkeep')).toThrow()
    })

    it('should add lambda function to infra app', async () => {
      const result = await runNxCommandAsync(`run ${infraProject}:cdk --command diff`)

      const { className } = names(lambdaProject)
      expect(result.stdout).toContain(`[+] AWS::Lambda::Function ${className}Function`)
    })
  })

  describe('cdk application generator', () => {
    const project = uniq('cdk')

    beforeAll(async () => {
      await runNxCommandAsync(`generate @routineless/nx-plugin:cdk-application ${project}`)
    })

    it('should generate cdk files', () => {
      expect(() => checkFilesExist(`apps/${project}/cdk.json`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/main.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/stacks/persistanceStack.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/stacks/persistanceStack.spec.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/app`)).toThrow()
    })

    it('should run cdk diff', async () => {
      const result = await runNxCommandAsync(`run ${project}:cdk --command diff`)

      expect(result.stdout).toContain('[+] AWS::S3::Bucket Bucket')
      expect(result.stdout).toContain(`Successfully ran target cdk for project ${project}`)
    })

    it('should run cdk tests', async () => {
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
      await runNxCommandAsync(`generate @routineless/nx-plugin:aws-lambda ${project}`)
    })

    describe('lambda runtime', () => {
      it('should generate files', () => {
        expect(() => checkFilesExist(`apps/${project}/runtime/project.json`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/runtime/src/main.ts`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/runtime/src/main.spec.ts`)).not.toThrow()
      })

      it('should tests', async () => {
        const result = await runNxCommandAsync(
          `test ${project}-runtime -- --codeCoverage=true --coverageReporters=text-summary`,
        )

        expect(result.stdout).toContain('Statements   : 100%')
        expect(result.stdout).toContain('Branches     : 100%')
        expect(result.stdout).toContain('Functions    : 100%')
        expect(result.stdout).toContain('Lines        : 100%')
        expect(result.stdout).toContain(`Successfully ran target test for project ${project}-runtime`)
      })
    })

    describe('lambda infra', () => {
      it('should generate files', () => {
        expect(() => checkFilesExist(`apps/${project}/infra/project.json`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/infra/src/index.ts`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/infra/src/index.spec.ts`)).not.toThrow()
      })

      it('should tests', async () => {
        const result = await runNxCommandAsync(
          `test ${project}-infra -- --codeCoverage=true --coverageReporters=text-summary`,
        )

        expect(result.stdout).toContain('Statements   : 100%')
        expect(result.stdout).toContain('Branches     : 100%')
        expect(result.stdout).toContain('Functions    : 100%')
        expect(result.stdout).toContain('Lines        : 100%')
        expect(result.stdout).toContain(`Successfully ran target test for project ${project}-infra`)
      })
    })
  })
})
