import { logger } from '@nrwl/devkit'
import {
  checkFilesExist,
  ensureNxProject, // readJson,
  runNxCommand,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing'

describe('cdk application', () => {
  const infraProject = uniq('infra')

  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(async () => {
    ensureNxProject('@routineless/nx-plugin', 'dist/packages/nx-plugin')
    await runNxCommandAsync(`generate @routineless/nx-plugin:preset --infraAppName=${infraProject}`)
  })

  afterAll(async () => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset')
  })

  describe('cdk application generator', () => {
    const project = uniq('cdk')

    beforeAll(async () => {
      logger.debug(runNxCommand(`generate @routineless/nx-plugin:cdk-application ${project} --verbose`))
    })

    it('should generate cdk files', () => {
      expect(() => checkFilesExist(`apps/${project}/cdk.json`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/main.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/stacks/persistanceStack.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/stacks/persistanceStack.spec.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/app`)).toThrow()
    })

    it('should run cdk diff', async () => {
      const result = await runNxCommandAsync(`run ${project}:cdk --command diff --skip-nx-cache`)

      // CDK outputs to stderr by default https://github.com/aws/aws-cdk/issues/7717
      // it was done to make logs colorized. It might be swithed off by setting CI env variable
      expect(result.stderr).toContain('[+] AWS::S3::Bucket Bucket')
      expect(result.stdout).toContain(`Successfully ran target cdk for project ${project}`)
    })

    it('should run cdk tests', async () => {
      const result = await runNxCommandAsync(`test ${project} -- --codeCoverage=true --output-style=\"static\"`)

      expect(result.stdout).toContain('All files            |     100 |      100 |     100 |     100')
      expect(result.stdout).toContain(`Successfully ran target test for project ${project}`)
    })
  })

  describe('routineless preset', () => {
    it('should create infra application', () => {
      expect(() => checkFilesExist(`apps/${infraProject}`)).not.toThrow()
    })

    it('should remove redundant files', () => {
      expect(() => checkFilesExist('apps/.gitkeep')).toThrow()
    })
  })
})
