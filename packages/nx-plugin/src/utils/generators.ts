import { Tree, getWorkspaceLayout, names } from '@nrwl/devkit'

type ProjectProperties = { projectName: string; projectRoot: string; projectDirectory: string }
type PackageProperties = { name: string; directory?: string }

export const injectProjectProperties = <T extends PackageProperties>(tree: Tree, options: T): T & ProjectProperties => {
  const name = names(options.name).fileName
  const projectDirectory = options.directory ? `${names(options.directory).fileName}/${name}` : name
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-')
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
  }
}
