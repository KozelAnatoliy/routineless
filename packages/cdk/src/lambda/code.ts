import { readCachedProjectGraph, workspaceRoot } from '@nx/devkit'
import { Code } from 'aws-cdk-lib/aws-lambda'
import callsite from 'callsite'
import path from 'path'

import { getProjectName } from '../utils/workspace'

type LambdaCodeContext = {
  projectName?: string
  filePath?: string
}
/**
 *  This function will try to resolve lambda code for cdk lambda by provided context.
 *  If project name was provided it will define it by retrieving project build output path from project graph.
 *  If filePath was provided it will try to resolve project by provided path replacing '-infra' postfix to '-runtime'
 *  and retrieve project build output path from project graph.
 *  If lambda code context was not provided if will use calling file path for resolution.
 *
 * @param lambdaCodeContext object with project name or file path
 * @returns {@link Code} object with lambda code
 */
export const getLambdaCode = (lambdaCodeContext?: LambdaCodeContext): Code => {
  const projectGraph = readCachedProjectGraph()

  let resolvedProjectName =
    lambdaCodeContext?.projectName ||
    getProjectName(lambdaCodeContext?.filePath || callsite()[1]!.getFileName(), projectGraph)

  if (!resolvedProjectName) {
    throw new Error('Could resolve project name')
  }

  // construct runtime project name if project name was not provided
  // and was resolved from execution context
  if (!lambdaCodeContext?.filePath) {
    resolvedProjectName = resolvedProjectName.replace('infra', 'runtime')
  }
  const projectNode = projectGraph.nodes[resolvedProjectName]
  const outputPath = projectNode?.data.targets?.['build']?.options.outputPath

  if (!outputPath) {
    throw new Error(`Could not resolve ${resolvedProjectName} build target output path`)
  }

  return Code.fromAsset(path.join(workspaceRoot, outputPath))
}
