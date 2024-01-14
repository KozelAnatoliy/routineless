import { builders, namedTypes } from 'ast-types'
import { NodePath } from 'ast-types/lib/node-path'

import { isRequireExpression, resolveReexportingName, resolveRelativePath } from './modifications-util'
import type { EsmModifications, ImportSpecifiersModification, ModificationFunction, Modifications } from './types'

export const isEsmModifications = (modifications: Modifications): modifications is EsmModifications => {
  return modifications.format === 'esm'
}

const localImportsExtensionModification: ModificationFunction<
  namedTypes.ImportDeclaration | namedTypes.ExportAllDeclaration | namedTypes.ExportNamedDeclaration
> = (
  file: string,
  path: NodePath<namedTypes.ImportDeclaration | namedTypes.ExportAllDeclaration | namedTypes.ExportNamedDeclaration>,
) => {
  const result = { modified: false, traverseChildren: false }
  if (path.node.source) {
    const resolvedValue = resolveRelativePath(file, path.value.source.value)
    if (path.node.source.value !== resolvedValue) {
      path.node.source.value = resolvedValue
      result.modified = true
    }
  }
  return result
}

const localRequireExtensionModification = (file: string, path: NodePath<namedTypes.CallExpression>) => {
  const result = { modified: false, traverseChildren: false }
  if (isRequireExpression(path.node) && namedTypes.StringLiteral.check(path.node.arguments[0])) {
    const resolvedValue = resolveRelativePath(file, path.node.arguments[0].value)
    if (path.node.arguments[0].value !== resolvedValue) {
      path.node.arguments[0].value = resolvedValue
      result.modified = true
    }
  }
  return result
}

const createImportSpecifiersModification = (modification: ImportSpecifiersModification) => {
  const { reexportedImports, reexportingModule } = modification
  return (_: string, path: NodePath<namedTypes.ImportDeclaration>) => {
    const result = { modified: false, traverseChildren: false }
    const importedModule = path.node.source.value as string
    if (!importedModule || !reexportedImports.has(importedModule)) return result
    // const imports = reexportedImports.get(reexportingModule)
    path.node.source.value = reexportingModule
    const initialSpecifiers = path.node.specifiers
    if (initialSpecifiers) {
      path.node.specifiers = initialSpecifiers.map((specifier) => {
        let result = specifier
        if (namedTypes.ImportSpecifier.check(specifier)) {
          const importedName = specifier.imported.name as string
          const resolvedName = resolveReexportingName(importedModule, { named: importedName })
          result = builders.importSpecifier(builders.identifier(resolvedName), specifier.local)
        }
        if (namedTypes.ImportDefaultSpecifier.check(specifier)) {
          const resolvedName = resolveReexportingName(importedModule, { default: true })
          result = builders.importSpecifier(builders.identifier(resolvedName), specifier.local)
        }
        if (namedTypes.ImportNamespaceSpecifier.check(specifier)) {
          const resolvedName = resolveReexportingName(importedModule, { namespace: true })
          result = builders.importSpecifier(builders.identifier(resolvedName), specifier.local)
        }
        return result
      })
    }
    result.modified = true
    return result
  }
}

export const modificationFactory = {
  localImportsExtensionModification,
  localRequireExtensionModification,
  createImportSpecifiersModification,
}
