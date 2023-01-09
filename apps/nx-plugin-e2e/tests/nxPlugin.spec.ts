import {
  checkFilesExist,
  ensureNxProject,
  exists,
  listFiles,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing'

describe('cdk application', () => {
  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(() => {
    ensureNxProject('@routineless/nx-plugin', 'dist/packages/nx-plugin')
  })

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset')
  })

  describe('cdk application generator', () => {
    const project = uniq('cdk')

    beforeAll(async () => {
      await runNxCommandAsync(`generate @routineless/nx-plugin:cdk-application ${project}`)
    })

    it('should generate cdk files', () => {
      expect(() => checkFilesExist(`apps/${project}/cdk.json`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/main.ts`)).not.toThrow()
      expect(() => checkFilesExist(`apps/${project}/src/app`)).toThrow()
    })

    it('should add cdk targets', async () => {
      const result = await runNxCommandAsync(`build ${project}`)
      // expect(result.stdout).toContain('Executor ran')
    })
  })

  describe('routineless preset', () => {
    const infraProject = uniq('infra')

    beforeAll(async () => {
      await runNxCommandAsync(`generate @routineless/nx-plugin:preset --infraAppName=${infraProject}`)
    })

    it('should create infra application', () => {
      expect(() => checkFilesExist(`apps/${infraProject}`)).not.toThrow()
    })
  })
})
