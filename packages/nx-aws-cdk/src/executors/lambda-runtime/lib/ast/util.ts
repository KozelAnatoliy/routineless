import { namedTypes } from 'ast-types'
import { NodePath } from 'ast-types/lib/node-path'
import { readFile, writeFile } from 'fs-extra'
import { iterate } from 'glob'
import path from 'path'
import { parse, print, visit } from 'recast'

import { PatternTrie } from '../../../../utils/trie'
import { isEsmModifications } from './modifications'
import type { Imports, ModificationFunction, ModificationResult, Modifications } from './types'

const reduceModifications = <T>(file: string, path: NodePath<T>, modifications: ModificationFunction<T>[]) => {
  return modifications.reduce(
    (acc: ModificationResult, modification: ModificationFunction<T>) => {
      const result = modification(file, path)
      return {
        modified: acc.modified || result.modified,
        traverseChildren: acc.traverseChildren || result.traverseChildren,
      }
    },
    {
      modified: false,
      traverseChildren: false,
    },
  )
}

export const applyModifications = async (
  distDir: string,
  modifications: Modifications,
  ignore = '**/node_modules/**',
) => {
  const globPattern = path.join(distDir, '**/*.{js,mjs,cjs}')
  const writePromises: Promise<void>[] = []
  for await (const file of iterate(globPattern, { ignore })) {
    const fileContent = await readFile(file, 'utf8')
    const code = parse(fileContent, { parser: require('recast/parsers/typescript') })
    let modificationsHaveBeenMade = false

    if (isEsmModifications(modifications)) {
      visit(code, {
        visitImportDeclaration(path) {
          const modificationsResult = reduceModifications(file, path, modifications.importDeclaration)
          modificationsHaveBeenMade = modificationsHaveBeenMade || modificationsResult.modified
          return modificationsResult.traverseChildren
        },
        visitExportAllDeclaration(path) {
          const modificationsResult = reduceModifications(file, path, modifications.exportAllDeclaration)
          modificationsHaveBeenMade = modificationsHaveBeenMade || modificationsResult.modified
          return modificationsResult.traverseChildren
        },
        visitExportNamedDeclaration(path) {
          const modificationsResult = reduceModifications(file, path, modifications.exportNamedDeclaration)
          modificationsHaveBeenMade = modificationsHaveBeenMade || modificationsResult.modified
          return modificationsResult.traverseChildren
        },
      })
    } else {
      visit(code, {
        visitCallExpression(path) {
          const modificationsResult = reduceModifications(file, path, modifications.callExpression)
          modificationsHaveBeenMade = modificationsHaveBeenMade || modificationsResult.modified
          return modificationsResult.traverseChildren
        },
      })
    }

    if (modificationsHaveBeenMade) {
      writePromises.push(writeFile(file, print(code).code))
    }
  }

  return Promise.all(writePromises)
}

export const collectAllImports = async (files: string[], excluded: string[] = []): Promise<Map<string, Imports>> => {
  const allImports = new Map<string, Imports>()
  const excludedPatternTrie = new PatternTrie(excluded)

  const addImport = (path: NodePath<namedTypes.ImportDeclaration>) => {
    if (path.node.importKind === 'value' && path.node.source) {
      const importModule = path.node.source.value as string
      if (excludedPatternTrie.has(importModule)) {
        return false
      }
      let importsAggregate = allImports.get(importModule)
      if (!importsAggregate) {
        importsAggregate = { namespaceImport: false, defaultImport: false, namedImports: new Set() }
        allImports.set(importModule, importsAggregate)
      }

      for (const specifier of path.node.specifiers || []) {
        if (namedTypes.ImportSpecifier.check(specifier)) {
          const importedName = specifier.imported.name as string
          importsAggregate.namedImports.add(importedName)
        } else if (namedTypes.ImportDefaultSpecifier.check(specifier)) {
          importsAggregate.defaultImport = true
        } else if (namedTypes.ImportNamespaceSpecifier.check(specifier)) {
          importsAggregate.namespaceImport = true
        }
      }
    }
    return false
  }

  await Promise.all(
    files.map((file) =>
      readFile(file, 'utf8').then((fileContent) => {
        const code = parse(fileContent, { parser: require('recast/parsers/typescript') })

        visit(code, {
          visitImportDeclaration(path) {
            return addImport(path)
          },
        })
      }),
    ),
  )

  return allImports
}
