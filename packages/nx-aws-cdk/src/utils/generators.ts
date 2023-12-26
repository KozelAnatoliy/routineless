import { Tree, extractLayoutDirectory, getWorkspaceLayout, joinPathFragments, names } from '@nx/devkit'

export type ProjectProperties = {
  projectName: string
  projectRoot: string
  projectDirectory: string
  appsDir: string
}
type PackageProperties = { name: string; directory?: string }

export const injectProjectProperties = <T extends PackageProperties>(tree: Tree, options: T): T & ProjectProperties => {
  const { layoutDirectory, projectDirectory: projectDirectoryFromOptions } = extractLayoutDirectory(
    options.directory || '',
  )
  const appsDir = layoutDirectory ?? getWorkspaceLayout(tree).appsDir

  const projectDirectoryFromName = names(options.name).fileName
  const projectDirectory = projectDirectoryFromOptions || projectDirectoryFromName

  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-')
  const projectRoot = joinPathFragments(appsDir, projectDirectory)

  return {
    ...options,
    appsDir,
    projectName,
    projectRoot,
    projectDirectory,
  }
}
