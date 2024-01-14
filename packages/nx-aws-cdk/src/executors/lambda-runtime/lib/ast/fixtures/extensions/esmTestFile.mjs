import { localImport } from './esmTestFile'
import { localIndexImport } from './esm'
import { localImportWithExtension } from './esmTestFile.mjs'
import { localImportWithJsExtension } from './esmTestFile.js'
import { externalImport } from 'external'
import defaultExternal from 'external'
import * as external from 'external'

export default from './esmTestFile'
export * from './esmTestFile'
export { default as reexport } from './esmTestFile'

console.log(localImport, externalImport)
