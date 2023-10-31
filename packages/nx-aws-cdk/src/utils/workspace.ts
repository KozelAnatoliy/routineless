import { Tree, readJson } from '@nx/devkit'
import ignore from 'ignore'

export const addGitIgnoreEntries = (host: Tree, entries: string[]) => {
  if (!host.exists('.gitignore')) {
    return
  }

  let content = host.read('.gitignore', 'utf-8')?.trimEnd() || ''

  const ig = ignore()
  ig.add(content)

  const newEntries = entries.filter((entry) => !ig.ignores(entry))
  if (newEntries.length < 1) {
    return
  }

  content = `${content}\n`
  for (const entry of newEntries) {
    content = `${content}\n${entry}`
  }

  host.write('.gitignore', content)
}

export const deleteNodeAppRedundantDirs = (tree: Tree, projectRoot: string) => {
  tree.delete(`${projectRoot}/src/app`)
}

export const deleteNodeLibRedundantDirs = (tree: Tree, projectRoot: string) => {
  tree.delete(`${projectRoot}/src/lib`)
}

export const getNpmScope = (tree: Tree): string | undefined => {
  const { name } = tree.exists('package.json') ? readJson<{ name?: string }>(tree, 'package.json') : { name: null }

  if (name?.startsWith('@')) {
    return name.split('/')[0]?.substring(1)
  }
  return undefined
}
