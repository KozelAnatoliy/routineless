import { ProjectGraph, readCachedProjectGraph, workspaceRoot } from '@nx/devkit'
import { createProjectRootMappings, findProjectForPath } from 'nx/src/project-graph/utils/find-project-for-path'

export const getProjectName = (path: string, projectGraph?: ProjectGraph): string | undefined => {
  const resolvedProjectGraph: ProjectGraph = projectGraph || readCachedProjectGraph()

  const projectRootMappings = createProjectRootMappings(resolvedProjectGraph.nodes)
  const relativePath = path.replace(`${workspaceRoot}/`, '').replace('dist/', '')
  let projectName = findProjectForPath(relativePath, projectRootMappings)

  if (projectName && isCdkProject(projectName, resolvedProjectGraph)) {
    const cdkOutputPath = resolvedProjectGraph.nodes[projectName]!.data.targets!['build']!.options.outputPath
    const cdkInnderProjectRelativePath = path.replace(`${workspaceRoot}/${cdkOutputPath}/`, '')
    projectName = findProjectForPath(cdkInnderProjectRelativePath, projectRootMappings)
  }

  return projectName || undefined
}

const isCdkProject = (projectName: string, projectGraph: ProjectGraph): boolean => {
  const cdkTarget = projectGraph.nodes[projectName]?.data.targets?.['cdk']
  return !!cdkTarget
}
