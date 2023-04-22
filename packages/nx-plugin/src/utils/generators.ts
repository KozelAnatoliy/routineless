import { Tree, extractLayoutDirectory, getWorkspaceLayout, joinPathFragments, names } from '@nrwl/devkit'

type ProjectProperties = { projectName: string; projectRoot: string; projectDirectory: string; appsDir: string }
type PackageProperties = { name: string; directory?: string }

export const injectProjectProperties = <T extends PackageProperties>(tree: Tree, options: T): T & ProjectProperties => {
  const { layoutDirectory, projectDirectory } = extractLayoutDirectory(options.directory || '')
  const appsDir = layoutDirectory ?? getWorkspaceLayout(tree).appsDir

  const appDirectory = projectDirectory
    ? `${names(projectDirectory).fileName}/${names(options.name).fileName}`
    : names(options.name).fileName

  const projectName = appDirectory.replace(new RegExp('/', 'g'), '-')
  const projectRoot = joinPathFragments(appsDir, appDirectory)

  return {
    ...options,
    appsDir,
    projectName,
    projectRoot,
    projectDirectory: appDirectory,
  }
}
