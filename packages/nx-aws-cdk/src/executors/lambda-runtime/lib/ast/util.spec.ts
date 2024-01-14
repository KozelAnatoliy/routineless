import { writeFile } from 'fs-extra'
import path from 'path'

import { applyModifications, collectAllImports, modificationFactory } from '.'

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  writeFile: jest.fn(),
}))

const mockedWriteFile = jest.mocked(writeFile)

describe('util', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('applyModifications', () => {
    const distDir = path.join(__dirname, 'fixtures', 'extensions')
    const failedDistDir = path.join(__dirname, 'fixtures', 'extensions-failed')

    describe('esm format', () => {
      const format = 'esm'

      it('should add .mjs extension to all local imports in the dist directory esm files', async () => {
        const externalBundleName = 'test-external'
        const collectedImports = await collectAllImports([path.join(distDir, 'esmTestFile.mjs')], ['.', '.*'])

        await applyModifications(distDir, {
          format,
          importDeclaration: [
            modificationFactory.localImportsExtensionModification,
            modificationFactory.createImportSpecifiersModification({
              reexportedImports: collectedImports,
              reexportingModule: externalBundleName,
            }),
          ],
          exportAllDeclaration: [modificationFactory.localImportsExtensionModification],
          exportNamedDeclaration: [modificationFactory.localImportsExtensionModification],
        })

        expect(mockedWriteFile).toHaveBeenCalledTimes(1)
        const mockCall = mockedWriteFile.mock.calls[0]
        expect(mockCall![0]).toEqual(path.join(__dirname, 'fixtures', 'extensions', 'esmTestFile.mjs'))
        const resultCode = mockCall![1] as string
        expect(resultCode).toContain('import { localImport } from "./esmTestFile.mjs"')
        expect(resultCode).toContain("import { localImportWithExtension } from './esmTestFile.mjs'")
        expect(resultCode).toContain('import { localImportWithJsExtension } from "./esmTestFile.mjs"')
        expect(resultCode).toContain(`import { externalExternalimport as externalImport } from "${externalBundleName}"`)
        expect(resultCode).toContain(`import { externalDefault as defaultExternal } from "${externalBundleName}"`)
        expect(resultCode).toContain(`import { externalNamespace as external } from "${externalBundleName}"`)
        expect(resultCode).toContain('export default from "./esmTestFile.mjs"')
        expect(resultCode).toContain('export * from "./esmTestFile.mjs"')
        expect(resultCode).toContain('export { default as reexport } from "./esmTestFile.mjs"')
      })

      it('should fail to add extension to unresolvable path', async () => {
        await expect(
          applyModifications(failedDistDir, {
            format: 'esm',
            importDeclaration: [modificationFactory.localImportsExtensionModification],
            exportAllDeclaration: [modificationFactory.localImportsExtensionModification],
            exportNamedDeclaration: [modificationFactory.localImportsExtensionModification],
          }),
        ).rejects.toThrow('Could not resolve relative path ./unresolvable from')
      })
    })

    describe('cjs format', () => {
      const format = 'cjs'

      it('should add .mjs extension to all local imports in the dist directory esm files', async () => {
        await applyModifications(distDir, {
          format,
          callExpression: [modificationFactory.localRequireExtensionModification],
        })

        expect(mockedWriteFile).toHaveBeenCalledTimes(1)
        const mockCall = mockedWriteFile.mock.calls[0]
        expect(mockCall![0]).toEqual(path.join(__dirname, 'fixtures', 'extensions', 'cjsTestFile.cjs'))
        const resultCode = mockCall![1] as string
        expect(resultCode).toContain('var localImport = require("./cjsTestFile.cjs")')
        expect(resultCode).toContain("var externalImport = require('external')")
      })
    })
  })

  describe('collectAllImports', () => {
    const distDir = path.join(__dirname, 'fixtures', 'imports')

    it('should collect all imports', async () => {
      const imports = await collectAllImports([path.join(distDir, 'app1.ts'), path.join(distDir, 'app2.ts')])

      const lib1Imports = imports.get('lib1')
      expect(lib1Imports).toBeDefined()
      expect(lib1Imports!.defaultImport).toEqual(false)
      expect(lib1Imports!.namespaceImport).toEqual(false)
      expect(Array.from(lib1Imports!.namedImports).sort()).toEqual([
        'lib1NamedImport1',
        'lib1NamedImport2',
        'lib1NamedImport3',
      ])

      const lib2Imports = imports.get('lib2')
      expect(lib2Imports).toBeDefined()
      expect(lib2Imports!.defaultImport).toEqual(true)
      expect(lib2Imports!.namespaceImport).toEqual(false)
      expect(Array.from(lib2Imports!.namedImports)).toEqual(['lib2NamedImport1'])

      const lib3Imports = imports.get('lib3')
      expect(lib3Imports).toBeDefined()
      expect(lib3Imports!.defaultImport).toEqual(false)
      expect(lib3Imports!.namespaceImport).toEqual(true)
      expect(Array.from(lib3Imports!.namedImports)).toEqual(['lib3NamedImport1'])
    })
  })
})
