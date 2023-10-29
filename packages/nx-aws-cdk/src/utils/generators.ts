import { Tree, extractLayoutDirectory, getWorkspaceLayout, joinPathFragments, names } from '@nx/devkit'

export type ProjectProperties = {
  projectName: string
  projectRoot: string
  projectDirectory: string
  appsDir: string
  appDirectory: string
}
type PackageProperties = { name: string; directory?: string }

export const injectProjectProperties = <T extends PackageProperties>(tree: Tree, options: T): T & ProjectProperties => {
  const { layoutDirectory, projectDirectory } = extractLayoutDirectory(options.directory || '')
  const appsDir = layoutDirectory ?? getWorkspaceLayout(tree).appsDir

  const projectDirectoryName = names(options.name).fileName
  const appDirectory = projectDirectory
    ? `${names(projectDirectory).fileName}/${projectDirectoryName}`
    : projectDirectoryName

  const projectName = appDirectory.replace(new RegExp('/', 'g'), '-')
  const projectRoot = joinPathFragments(appsDir, appDirectory)
  let rootProjectDirectory = projectRoot.replace(projectDirectoryName, '') || '.'
  if (rootProjectDirectory.endsWith('/')) {
    rootProjectDirectory = rootProjectDirectory.slice(0, -1)
  }

  return {
    ...options,
    appsDir,
    appDirectory,
    projectName,
    projectRoot,
    projectDirectory: rootProjectDirectory,
  }
}
