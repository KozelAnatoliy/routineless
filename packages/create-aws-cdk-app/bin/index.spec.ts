import { createWorkspace } from 'create-nx-workspace'

jest.mock('create-nx-workspace')

describe('main', () => {
  let originalArgv: string[]
  const mockedCreateWorkspace = jest.mocked(createWorkspace)

  beforeEach(() => {
    // Each test overwrites process arguments so store the original arguments
    originalArgv = process.argv
  })

  afterEach(() => {
    jest.resetAllMocks()

    // Set process arguments back to the original value
    process.argv = originalArgv
  })

  it('should create a workspace with the correct arguments', async () => {
    jest.doMock('../package.json', () => ({ version: '<version>' }))
    mockedCreateWorkspace.mockResolvedValue({ directory: 'directory', nxCloudInfo: 'cludInfo' })

    await runCommand('workspace-name', '--i', 'infra-app', '--l', 'lambda-app', '--nxCloud', '--u', 'none')

    expect(mockedCreateWorkspace).toHaveBeenCalledWith('@routineless/nx-aws-cdk@<version>', {
      i: 'infra-app',
      l: 'lambda-app',
      nxCloud: true,
      name: 'workspace-name',
      packageManager: 'npm',
      unitTestRunner: 'none',
    })
  })
})

const runCommand = async (...args: string[]) => {
  process.argv = ['node', 'index.ts', ...args]

  return import('./index')
}
