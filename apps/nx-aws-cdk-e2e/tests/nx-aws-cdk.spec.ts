import { names } from '@nx/devkit'
import {
  checkFilesExist,
  ensureNxProject,
  listFiles,
  readJson,
  runCommandAsync,
  runNxCommandAsync,
  runPackageManagerInstall,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nx/plugin/testing'
import { copyFile, ensureDir } from 'fs-extra'
import path from 'path'
import stripAnsi from 'strip-ansi-cjs'

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
    ensureNxProject()
    await runCommandAsync('npm install @routineless/nx-aws-cdk@local')
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
    process.env = { ...OLD_ENV, CI: 'true', ROUTINELESS_LOG_LEVEL: 'debug' }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  describe('nx-aws-cdk preset', () => {
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
      await runNxCommandAsync(`localstack ${infraProject} stop`)
      await runNxCommandAsync(`run ${infraProject}:cdk bootstrap`)
      const { className } = names(lambdaProject)

      const result = await runNxCommandAsync(`run ${infraProject}:cdk diff ${className}StackLocal`)
      const strippedStdout = stripAnsi(result.stdout)

      expect(strippedStdout).toContain(
        `debug: Cdk executor options {"_":["diff","${className}StackLocal"],"command":"diff"`,
      )
      expect(strippedStdout).toContain('debug: Finished /bin/sh -c AWS_ENV=local')
      expect(strippedStdout).toContain(`[+] AWS::Lambda::Function ${className}Function`)
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
      await runNxCommandAsync(`localstack ${infraProject} stop`)
      await runNxCommandAsync(`run ${project}:cdk bootstrap`)

      process.env['ROUTINELESS_LOG_LEVEL'] = 'info'
      const result = await runNxCommandAsync(`run ${project}:cdk diff`)
      const strippedStdout = stripAnsi(result.stdout)

      expect(strippedStdout).not.toContain('debug: Cdk executor options')
      expect(strippedStdout).not.toContain('debug: Finished /bin/sh -c AWS_ENV=local')
      expect(strippedStdout).toContain('[+] AWS::S3::Bucket Bucket')
      expect(strippedStdout).toContain(`Successfully ran target cdk for project ${project}`)
    })

    it('should have tests coverage', async () => {
      const result = await runNxCommandAsync(`test ${project} -- --codeCoverage=true --coverageReporters=text-summary`)
      const strippedStdout = stripAnsi(result.stdout)

      expect(strippedStdout).toContain('Statements   : 100%')
      expect(strippedStdout).toContain('Branches     : 100%')
      expect(strippedStdout).toContain('Functions    : 100%')
      expect(strippedStdout).toContain('Lines        : 100%')
      expect(strippedStdout).toContain(`Successfully ran target test for project ${project}`)
    })
  })

  describe('aws-lambda generator', () => {
    const project = uniq('aws-lambda')

    beforeAll(async () => {
      await runNxCommandAsync(`generate aws-lambda ${project}`)
    })

    describe('lambda runtime', () => {
      it('should generate files', () => {
        expect(() => checkFilesExist(`apps/${project}/runtime/project.json`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/runtime/src/main.ts`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/runtime/src/main.spec.ts`)).not.toThrow()
      })

      it('should have tests coverage', async () => {
        const result = await runNxCommandAsync(
          `test ${project}-runtime -- --codeCoverage=true --coverageReporters=text-summary`,
        )
        const strippedStdout = stripAnsi(result.stdout)

        expect(strippedStdout).toContain('Statements   : 100%')
        expect(strippedStdout).toContain('Branches     : 100%')
        expect(strippedStdout).toContain('Functions    : 100%')
        expect(strippedStdout).toContain('Lines        : 100%')
        expect(strippedStdout).toContain(`Successfully ran target test for project ${project}-runtime`)
      })
    })

    describe('lambda infra', () => {
      it('should generate files', () => {
        expect(() => checkFilesExist(`apps/${project}/infra/project.json`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/infra/src/index.ts`)).not.toThrow()
        expect(() => checkFilesExist(`apps/${project}/infra/src/index.spec.ts`)).not.toThrow()
      })

      it('should have tests coverage', async () => {
        const result = await runNxCommandAsync(
          `test ${project}-infra -- --codeCoverage=true --coverageReporters=text-summary`,
        )
        const strippedStdout = stripAnsi(result.stdout)

        expect(strippedStdout).toContain('Statements   : 100%')
        expect(strippedStdout).toContain('Branches     : 100%')
        expect(strippedStdout).toContain('Functions    : 100%')
        expect(strippedStdout).toContain('Lines        : 100%')
        expect(strippedStdout).toContain(`Successfully ran target test for project ${project}-infra`)
      })

      it('should add lambda infra to cdk app', async () => {
        await runNxCommandAsync(`localstack ${infraProject} stop`)
        await runNxCommandAsync(`run ${infraProject}:cdk bootstrap`)
        const { className } = names(project)

        const result = await runNxCommandAsync(`run ${infraProject}:cdk diff ${className}StackLocal`)
        const strippedStdout = stripAnsi(result.stdout)

        expect(strippedStdout).toContain(`[+] AWS::Lambda::Function ${className}Function`)
        expect(strippedStdout).toContain(`Successfully ran target cdk for project ${infraProject}`)
      })

      it('should deploy lambda from cdk app', async () => {
        await runNxCommandAsync(`localstack ${infraProject} stop`)
        await runNxCommandAsync(`run ${infraProject}:cdk bootstrap`)
        const { className, fileName } = names(project)

        const deployResult = await runNxCommandAsync(
          `run ${infraProject}:cdk deploy ${className}StackLocal --require-approval never`,
        )
        expect(stripAnsi(deployResult.stdout)).toContain(`Successfully ran target cdk for project ${infraProject}`)

        await runCommandAsync(`awslocal lambda invoke --function-name ${className}Local ${fileName}-response.json`)
        const invokeResult = await runCommandAsync(`cat ${fileName}-response.json`)
        expect(stripAnsi(invokeResult.stdout)).toContain('Hello World')
        const destroyResult = await runNxCommandAsync(`run ${infraProject}:cdk destroy ${className}StackLocal -f`)
        expect(stripAnsi(destroyResult.stdout)).toContain(`${className}StackLocal: destroyed`)
      })
    })
  })

  describe('aws-lambda executor', () => {
    const project = uniq('aws-lambda')
    const runtimeProject = `${project}-runtime`
    const { className, fileName } = names(project)

    const distFolder = `dist/apps/${project}/runtime`

    const updateProjectConfig = (
      options: any,
      configurations: any = {
        development: {
          bundle: false,
        },
        production: {
          bundle: true,
          minify: true,
        },
      },
    ) => {
      const projectConfig = readJson(`apps/${project}/runtime/project.json`)
      updateFile(
        `apps/${project}/runtime/project.json`,
        JSON.stringify({
          ...projectConfig,
          targets: {
            ...projectConfig.targets,
            build: {
              ...projectConfig.targets.build,
              options: {
                ...projectConfig.targets.build.options,
                ...options,
              },
              configurations: {
                ...configurations,
              },
            },
          },
        }),
      )
    }

    beforeAll(async () => {
      await runNxCommandAsync(`generate aws-lambda ${project}`)
      await runNxCommandAsync(
        'g @nx/node:library libs/direct-internal --projectNameAndRootFormat as-provided --buildable',
      )
      await runNxCommandAsync(
        'g @nx/node:library libs/transitive-internal --projectNameAndRootFormat as-provided --buildable',
      )

      await runCommandAsync('npm i is-even')
      await runCommandAsync('npm i --save-dev @types/is-even')
      await runCommandAsync('npm i @sigma-js/primes')
      await runCommandAsync('npm i mathjs')

      await copyFile(
        path.resolve(__dirname, 'fixtures/lambda-executor/main.ts'),
        tmpProjPath(`apps/${project}/runtime/src/main.ts`),
      )
      await ensureDir(tmpProjPath(`apps/${project}/runtime/src/app`))
      await copyFile(
        path.resolve(__dirname, 'fixtures/lambda-executor/math.ts'),
        tmpProjPath(`apps/${project}/runtime/src/app/math.ts`),
      )
      await copyFile(
        path.resolve(__dirname, 'fixtures/lambda-executor/direct-internal.ts'),
        tmpProjPath(`libs/direct-internal/src/lib/direct-internal.ts`),
      )
      await copyFile(
        path.resolve(__dirname, 'fixtures/lambda-executor/transitive-internal.ts'),
        tmpProjPath(`libs/transitive-internal/src/lib/transitive-internal.ts`),
      )

      updateProjectConfig({
        generatePackageJson: true,
        metafile: true,
      })

      await runNxCommandAsync(`localstack ${infraProject} stop`)
      await runNxCommandAsync(`run ${infraProject}:cdk bootstrap`)
    })

    describe('build', () => {
      it('should build default unbandled lambda', async () => {
        await runNxCommandAsync(`build ${runtimeProject}`)

        expect(() => checkFilesExist(distFolder)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/main.mjs`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/package.json`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/meta.json`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/app/math.mjs`)).not.toThrow()

        expect(() => checkFilesExist(`${distFolder}/node_modules/external`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/node_modules/@proj/direct-internal`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/node_modules/@proj/transitive-internal`)).not.toThrow()
      })

      it('should fail building unbunlded cjs lambda', async () => {
        await expect(runNxCommandAsync(`build ${runtimeProject} --format cjs`)).rejects.toThrow()
      })

      it('should build bundled lambda', async () => {
        await runNxCommandAsync(`build ${runtimeProject} --configuration=production`)

        expect(() => checkFilesExist(`${distFolder}/main.mjs`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/app/math.mjs`)).toThrow()
        expect(() => checkFilesExist(`${distFolder}/node_modules`)).toThrow()
      })

      it('should exclude third party libs', async () => {
        await runNxCommandAsync(`build ${runtimeProject} --thirdParty=false`)

        expect(() => checkFilesExist(distFolder)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/main.mjs`)).not.toThrow()
        const resolvedExternalLibs = listFiles(`${distFolder}/node_modules`)

        expect(resolvedExternalLibs.length).toEqual(1)
        expect(resolvedExternalLibs).toEqual(expect.arrayContaining(['@proj']))
        expect(() => checkFilesExist(`${distFolder}/node_modules/@proj/direct-internal`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/node_modules/@proj/transitive-internal`)).not.toThrow()
      })

      it('should exclude external libs', async () => {
        await runNxCommandAsync(`build ${runtimeProject} --external "@babel/*,@proj/transitive-internal"`)

        expect(() => checkFilesExist(distFolder)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/main.mjs`)).not.toThrow()

        // excluded libs
        const expectedExternalLibs = ['@babel/runtime', '@proj/transitive-internal']
        const packageJsonDepedencies = readJson(`${distFolder}/package.json`).dependencies || {}

        expect(Object.keys(packageJsonDepedencies)).toEqual(expectedExternalLibs)
        expect(() => checkFilesExist(`${distFolder}/node_modules/@proj/direct-internal`)).not.toThrow()
        expect(() => checkFilesExist(`${distFolder}/node_modules/@proj/transitive-internal`)).toThrow()
      })
    })

    describe('deploy', () => {
      const invokeFunction = async (input: number): Promise<string> => {
        await runCommandAsync(
          `awslocal lambda invoke --function-name ${className}Local --cli-binary-format raw-in-base64-out --payload '{ "input": ${input} }' ${fileName}-response.json`,
        )
        const { stdout } = await runCommandAsync(`cat ${fileName}-response.json`)
        return JSON.parse(JSON.parse(stdout).body).message
      }

      afterAll(async () => {
        await runNxCommandAsync(`run ${infraProject}:cdk destroy ${className}StackLocal -f`)
      })

      it('should deploy unbandled esm lambda', async () => {
        updateProjectConfig(
          {
            format: 'esm',
          },
          {
            development: {
              bundle: false,
            },
          },
        )
        const deployResult = await runNxCommandAsync(
          `run ${infraProject}:cdk deploy ${className}StackLocal --require-approval never`,
        )
        expect(stripAnsi(deployResult.stdout)).toContain(`Successfully ran target cdk for project ${infraProject}`)

        const message = await invokeFunction(2)
        expect(message).toContain('lambda handler. 2 sqrt is 1.4142135623730951.')
        expect(message).toContain('direct-internal. 2 is prime. Factors: 2. Max number: 8388607.')
        expect(message).toContain('transitive-internal. 2 is even.')
      })

      it('should deploy bandled esm lambda', async () => {
        updateProjectConfig(
          {
            format: 'esm',
          },
          {
            development: {
              bundle: true,
            },
          },
        )
        const deployResult = await runNxCommandAsync(
          `run ${infraProject}:cdk deploy ${className}StackLocal --require-approval never`,
        )
        expect(stripAnsi(deployResult.stdout)).toContain(`Successfully ran target cdk for project ${infraProject}`)

        const message = await invokeFunction(4)
        expect(message).toContain('lambda handler. 4 sqrt is 2.')
        expect(message).toContain('direct-internal. 4 is not prime. Factors: 2, 2. Max number: 8388607.')
        expect(message).toContain('transitive-internal. 4 is even.')
      })

      it('should deploy bandled cjs lambda', async () => {
        updateProjectConfig(
          {
            format: 'cjs',
          },
          {
            development: {
              bundle: true,
            },
          },
        )
        const deployResult = await runNxCommandAsync(
          `run ${infraProject}:cdk deploy ${className}StackLocal --require-approval never`,
        )
        expect(stripAnsi(deployResult.stdout)).toContain(`Successfully ran target cdk for project ${infraProject}`)

        const message = await invokeFunction(5)
        expect(message).toContain('lambda handler. 5 sqrt is 2.23606797749979.')
        expect(message).toContain('direct-internal. 5 is prime. Factors: 5. Max number: 8388607.')
        expect(message).toContain('transitive-internal. 5 is odd.')
      })
    })
  })

  describe('localstack executor', () => {
    const composeFile = 'custom-docker-compose.yaml'

    beforeAll(async () => {
      await runNxCommandAsync(`localstack ${infraProject} stop`)
      await copyFile(path.join(__dirname, 'fixtures', composeFile), path.join(tmpProjPath(), composeFile))
    })

    it('should run localstack start command', async () => {
      await runNxCommandAsync(`localstack ${infraProject} start`)

      const { stdout } = await runCommandAsync('docker ps --format json')

      expect(stdout).toContain('"Image":"localstack/localstack"')
      expect(stdout).toContain('"State":"running"')

      await runNxCommandAsync(`localstack ${infraProject} stop`)
    })

    it('should run localstack with provided compose file', async () => {
      await runNxCommandAsync(`localstack ${infraProject} start --composeFile ${composeFile}`)

      let { stdout } = await runCommandAsync('docker ps --format json')

      expect(stdout).toContain('"Image":"localstack/localstack"')
      expect(stdout).toContain('"Names":"e2e-custom-localstack"')
      expect(stdout).toContain('"State":"running"')

      await runNxCommandAsync(`localstack ${infraProject} stop --composeFile ${composeFile}`)

      stdout = (await runCommandAsync('docker ps --format json')).stdout

      expect(stdout).not.toContain('"Image":"localstack/localstack"')
      expect(stdout).not.toContain('"State":"running"')
    })

    it('should start localstack through cdk using default overrides', async () => {
      const nxJson = readJson('nx.json')
      nxJson.targetDefaults.localstack = {
        options: {
          composeFile,
        },
      }
      updateFile('nx.json', JSON.stringify(nxJson))

      await runNxCommandAsync(`cdk ${infraProject} bootstrap`)

      let { stdout } = await runCommandAsync('docker ps --format json')

      expect(stdout).toContain('"Image":"localstack/localstack"')
      expect(stdout).toContain('"Names":"e2e-custom-localstack"')
      expect(stdout).toContain('"State":"running"')

      await runNxCommandAsync(`localstack ${infraProject} stop`)

      stdout = (await runCommandAsync('docker ps --format json')).stdout

      expect(stdout).not.toContain('"Image":"localstack/localstack"')
      expect(stdout).not.toContain('"State":"running"')
    })
  })
})
