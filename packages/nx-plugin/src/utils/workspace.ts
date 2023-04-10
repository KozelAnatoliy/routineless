import type { Tree } from '@nrwl/devkit'
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
