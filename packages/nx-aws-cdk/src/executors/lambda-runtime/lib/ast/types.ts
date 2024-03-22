import { namedTypes } from 'ast-types'
import { NodePath } from 'ast-types/lib/node-path'

export type ModificationResult = {
  modified: boolean
  traverseChildren: boolean
}

export type ModificationFunction<T> = (file: string, node: NodePath<T>) => ModificationResult

export type Modifications = CjsModifications | EsmModifications

export type Imports = {
  namespaceImport: boolean
  defaultImport: boolean
  sideEffectImport: boolean
  namedImports: Set<string>
}

export type CjsModifications = {
  format: 'cjs'
  callExpression: ModificationFunction<namedTypes.CallExpression>[]
}

export type EsmModifications = {
  format: 'esm'
  importDeclaration: ModificationFunction<namedTypes.ImportDeclaration>[]
  exportAllDeclaration: ModificationFunction<namedTypes.ExportAllDeclaration>[]
  exportNamedDeclaration: ModificationFunction<namedTypes.ExportNamedDeclaration>[]
}

export type ImportSpecifiersModification = {
  reexportedImports: Map<string, Imports>
  reexportingModule: string
}
