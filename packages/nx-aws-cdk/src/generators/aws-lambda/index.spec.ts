import { GeneratorCallback, Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import generator from '.'
import infraGenerator from './infra-generator'
import runtimeGenerator from './runtime-generator'
import { AwsLambdaGeneratorSchema } from './schema'

jest.mock('./infra-generator')
jest.mock('./runtime-generator')

const mockedInfraGenerator = jest.mocked(infraGenerator, { shallow: true })
const mockedRuntimeGenerator = jest.mocked(runtimeGenerator, { shallow: true })

describe('aws-lambda generator', () => {
  let appTree: Tree
  const options: AwsLambdaGeneratorSchema = { name: 'test-aws-lambda' }
  const testGeneratorCallback: GeneratorCallback = () => {
    return new Promise<void>((resolve) => resolve())
  }

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' })
    mockedRuntimeGenerator.mockResolvedValue(testGeneratorCallback)
    mockedInfraGenerator.mockResolvedValue(testGeneratorCallback)
  })

  afterEach(() => jest.clearAllMocks())

  it('should run infra and runtime generator', async () => {
    await generator(appTree, options)

    expect(mockedRuntimeGenerator).toHaveBeenCalledWith(
      appTree,
      expect.objectContaining({
        projectRoot: 'apps/test-aws-lambda',
        name: options.name,
      }),
    )
    expect(mockedInfraGenerator).toHaveBeenCalledWith(
      appTree,
      expect.objectContaining({
        projectRoot: 'apps/test-aws-lambda',
        name: options.name,
      }),
    )
  })

  it('should fail on generator failure', async () => {
    const errorMessage = 'Runtime lambda generator error'
    mockedRuntimeGenerator.mockRejectedValue(new Error(errorMessage))

    await expect(generator(appTree, options)).rejects.toThrow(errorMessage)
  })
})
