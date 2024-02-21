import { CreateNodesContext, TargetConfiguration } from '@nx/devkit'

import lambdaInfraInference from './generators/aws-lambda/infra-generator/inferrence'
import lambdaRuntimeInference from './generators/aws-lambda/runtime-generator/inferrence'
import cdkAppInference from './generators/cdk-application/inferrence'
import { createNodes } from './index'

jest.mock('./generators/aws-lambda/infra-generator/inferrence', () => ({
  predicate: jest.fn(),
  createNodesFunction: jest.fn(),
}))
jest.mock('./generators/aws-lambda/runtime-generator/inferrence', () => ({
  predicate: jest.fn(),
  createNodesFunction: jest.fn(),
}))
jest.mock('./generators/cdk-application/inferrence', () => ({
  predicate: jest.fn(),
  createNodesFunction: jest.fn(),
}))

const mockedLambdaRuntimePredicate = jest.mocked(lambdaRuntimeInference.predicate)
const mockedLambdaRuntimeCreateNodesFunction = jest.mocked(lambdaRuntimeInference.createNodesFunction)
const mockedLambdaInfraPredicate = jest.mocked(lambdaInfraInference.predicate)
const mockedLambdaInfraCreateNodesFunction = jest.mocked(lambdaInfraInference.createNodesFunction)
const mockedCdkAppPredicate = jest.mocked(cdkAppInference.predicate)
const mockedCdkAppCreateNodesFunction = jest.mocked(cdkAppInference.createNodesFunction)

describe('nx-aws-cdk', () => {
  const projectName = 'project'
  const projectRoot = `/path/to/${projectName}`
  const projectConfigPath = `${projectRoot}/project.json`
  const context: CreateNodesContext = {
    nxJsonConfiguration: {},
    workspaceRoot: 'root',
  }

  const createResultNode = (targets: { [targetName: string]: TargetConfiguration }) => ({
    projects: {
      [projectRoot]: {
        targets: { ...targets },
      },
    },
  })

  beforeEach(() => {
    mockedLambdaRuntimePredicate.mockReturnValue(true)
    mockedLambdaInfraPredicate.mockReturnValue(true)
    mockedCdkAppPredicate.mockReturnValue(true)
    mockedLambdaRuntimeCreateNodesFunction.mockResolvedValue(createResultNode({ runtime: { executor: 'executor' } }))
    mockedLambdaInfraCreateNodesFunction.mockResolvedValue(createResultNode({ infra: { executor: 'executor' } }))
    mockedCdkAppCreateNodesFunction.mockResolvedValue(createResultNode({ cdk: { executor: 'executor' } }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should filter by project.json', () => {
    expect(createNodes[0]).toBe('**/project.json')
  })

  it('should return empty object if no applicable generators', async () => {
    mockedLambdaRuntimePredicate.mockReturnValue(false)
    mockedLambdaInfraPredicate.mockReturnValue(false)
    mockedCdkAppPredicate.mockReturnValue(false)

    const nodes = await createNodes[1](projectConfigPath, undefined, context)

    expect(nodes).toEqual({})
  })

  it('should add applicatble targets', async () => {
    const nodes = await createNodes[1](projectConfigPath, undefined, context)

    expect(nodes).toEqual({
      projects: {
        [projectRoot]: {
          targets: {
            infra: { executor: 'executor' },
            runtime: { executor: 'executor' },
            cdk: { executor: 'executor' },
          },
        },
      },
    })
  })

  it('should not add filtered targets', async () => {
    mockedLambdaInfraPredicate.mockReturnValue(false)

    const nodes = await createNodes[1](projectConfigPath, undefined, context)

    expect(nodes).toEqual({
      projects: {
        [projectRoot]: {
          targets: {
            runtime: { executor: 'executor' },
            cdk: { executor: 'executor' },
          },
        },
      },
    })
  })

  it('should ovwerwrite targets', async () => {
    mockedLambdaInfraCreateNodesFunction.mockResolvedValue(createResultNode({ cdk: { executor: 'infra' } }))
    mockedCdkAppCreateNodesFunction.mockResolvedValue(createResultNode({ cdk: { executor: 'cdk' } }))

    const nodes = await createNodes[1](projectConfigPath, undefined, context)

    expect(nodes).toEqual({
      projects: {
        [projectRoot]: {
          targets: {
            runtime: { executor: 'executor' },
            cdk: { executor: 'infra' },
          },
        },
      },
    })
  })
})
