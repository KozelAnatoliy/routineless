import { toCamelCase } from '@routineless/cdk'
import { namedTypes } from 'ast-types'
import { existsSync, statSync } from 'fs-extra'
import path from 'path'

const extensions = ['.js', '.mjs', '.cjs']

export const isRequireExpression = (node: namedTypes.CallExpression) => {
  return namedTypes.Identifier.check(node.callee) && node.callee.name === 'require'
}

export const resolveRelativePath = (importingFile: string, relativePath: string): string => {
  if (!relativePath.startsWith('.')) {
    return relativePath
  }

  const containingDir = path.dirname(importingFile)

  if (
    existsSync(path.join(containingDir, relativePath)) &&
    !statSync(path.join(containingDir, relativePath)).isDirectory()
  ) {
    // if the file already exists, e.g. .css files, just use it
    return relativePath
  }

  // strip the file extension if applicable
  const extensonlessPath = relativePath.replace(/\.(m|c)?js$/, '')

  for (const extension of extensions) {
    let candidate = `${extensonlessPath}${extension}`
    if (existsSync(path.join(containingDir, candidate))) {
      return candidate
    }

    candidate = `${relativePath}/index${extension}`

    if (existsSync(path.join(containingDir, candidate))) {
      return candidate
    }
  }

  throw new Error(`Could not resolve relative path ${relativePath} from ${importingFile}`)
}

type ImportSpecifier =
  | { default: true; namespace?: never; named?: never }
  | { default?: never; namespace: true; named?: never }
  | { default?: never; namespace?: never; named: string }

export const resolveReexportingName = (importedModule: string, importSpecifier: ImportSpecifier): string => {
  const normalizedImportedModule = importedModule.replace(/[/.]/g, '-').replaceAll('@', '')
  if (importSpecifier.namespace) {
    return `${toCamelCase(normalizedImportedModule)}Namespace`
  }
  if (importSpecifier.default) {
    return `${toCamelCase(normalizedImportedModule)}Default`
  }
  return toCamelCase(`${normalizedImportedModule}-${importSpecifier.named}`)
}
