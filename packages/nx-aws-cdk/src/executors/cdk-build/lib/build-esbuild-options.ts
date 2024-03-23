import { ExecutorContext, joinPathFragments, normalizePath } from '@nx/devkit'
import * as esbuild from 'esbuild'
import { mkdirSync, writeFileSync } from 'fs'
import * as path from 'path'

import { getEntryPoints } from '../../../utils/esbuild'
import { getTsConfigCompilerPaths } from '../../../utils/workspace'
import { CdkBuildExecutorOptions } from '../schema'

export const buildEsbuildOptions = (
  options: CdkBuildExecutorOptions,
  context: ExecutorContext,
): esbuild.BuildOptions => {
  const outExtension = '.js'
  const esbuildOptions: esbuild.BuildOptions = {
    entryNames: '[dir]/[name]',
    bundle: false,
    platform: 'node',
    target: 'esnext',
    tsconfig: options.tsConfig,
    format: 'cjs',
    outExtension: {
      '.js': outExtension,
    },
    outdir: options.outputPath,
  }

  const entryPoints = [options.main]

  // When target platform Node and target format is CJS, then also transpile workspace libs used by the app.
  // Provide a `require` override in the main entry file so workspace libs can be loaded when running the app.
  const paths = getTsConfigCompilerPaths(context)
  const entryPointsFromProjects = getEntryPoints(context.projectName!, context, {
    initialTsConfigFileName: options.tsConfig,
    initialEntryPoints: entryPoints,
    recursive: true,
    excludeImplicit: true,
  })

  esbuildOptions.entryPoints = [
    // Write a main entry file that registers workspace libs and then calls the user-defined main.
    writeTmpEntryWithRequireOverrides(paths, outExtension, options, context),
    ...entryPointsFromProjects.map((f) => {
      /**
       * Maintain same directory structure as the workspace, so that other workspace libs may be used by the project.
       * dist
       * └── apps
       *     └── demo
       *         ├── apps
       *         │   └── demo
       *         │       └── src
       *         │           └── main.js (requires '@acme/utils' which is mapped to libs/utils/src/index.js)
       *         ├── libs
       *         │   └── utils
       *         │       └── src
       *         │           └── index.js
       *         └── main.js (entry with require overrides)
       */
      const { dir, name } = path.parse(f)
      return {
        in: f,
        out: path.join(dir, name),
      }
    }),
  ]

  return esbuildOptions
}

const writeTmpEntryWithRequireOverrides = (
  paths: Record<string, string[]>,
  outExtension: '.cjs' | '.js' | '.mjs',
  options: CdkBuildExecutorOptions,
  context: ExecutorContext,
): { in: string; out: string } => {
  const project = context.projectGraph!.nodes[context.projectName!]!
  // Write a temp main entry source that registers workspace libs.
  const tmpPath = path.join(context.root, 'tmp', project.name)
  mkdirSync(tmpPath, { recursive: true })

  const { name: mainFileName, dir: mainPathRelativeToDist } = path.parse(options.main)
  const mainWithRequireOverridesInPath = path.join(tmpPath, `main-with-require-overrides.js`)
  writeFileSync(
    mainWithRequireOverridesInPath,
    getRegisterFileContent(
      paths,
      `./${path.join(mainPathRelativeToDist, `${mainFileName}${outExtension}`)}`,
      outExtension,
    ),
  )

  let mainWithRequireOverridesOutPath: string
  if (mainPathRelativeToDist === '' || mainPathRelativeToDist === '.') {
    // If the user customized their entry such that it is not inside `src/` folder
    throw new Error(
      `There is a conflict between Nx-generated main file and the project's main file. Main file should be under src/ folder.`,
    )
  } else {
    mainWithRequireOverridesOutPath = path.parse(mainFileName).name
  }

  return {
    in: mainWithRequireOverridesInPath,
    out: mainWithRequireOverridesOutPath,
  }
}

type ManifestEntry = {
  module: string
  pattern: string
  exactMatch?: string
}

const getRegisterFileContent = (paths: Record<string, string[]>, mainFile: string, outExtension: string) => {
  mainFile = normalizePath(mainFile)

  // Sort by longest prefix so imports match the most specific path.
  const sortedKeys = Object.keys(paths).sort((a: string, b: string) => getPrefixLength(b) - getPrefixLength(a))
  const manifest: Array<ManifestEntry> = sortedKeys.reduce((acc: ManifestEntry[], k) => {
    let exactMatch: string | undefined

    // Nx generates a single path entry.
    // If more sophisticated setup is needed, we can consider tsconfig-paths.
    const pattern = paths[k]![0]!

    const manifestEntry: ManifestEntry = { module: k, pattern }

    if (/.[cm]?ts$/.test(pattern)) {
      // Path specifies a single entry point e.g. "a/b/src/index.ts".
      // This is the default setup.
      const { dir, name } = path.parse(pattern)
      exactMatch = joinPathFragments(dir, `${name}${outExtension}`)
      if (exactMatch) {
        manifestEntry.exactMatch = exactMatch
      }
    }
    acc.push(manifestEntry)
    return acc
  }, [])

  return `
/**
 * IMPORTANT: Do not modify this file.
 * This file allows the app to run without bundling in workspace libraries.
 * Must be contained in the ".nx" folder inside the output path.
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');
const originalResolveFilename = Module._resolveFilename;
const distPath = __dirname;
const manifest = ${JSON.stringify(manifest)};

Module._resolveFilename = function(request, parent) {
  let found;
  for (const entry of manifest) {
    if (request === entry.module && entry.exactMatch) {
      const entry = manifest.find((x) => request === x.module || request.startsWith(x.module + "/"));
      const candidate = path.join(distPath, entry.exactMatch);
      if (isFile(candidate)) {
        found = candidate;
        break;
      }
    } else {
      const re = new RegExp(entry.module.replace(/\\*$/, "(?<rest>.*)"));
      const match = request.match(re);

      if (match?.groups) {
        const candidate = path.join(distPath, entry.pattern.replace("*", ""), match.groups.rest + ".js");
        if (isFile(candidate)) {
          found = candidate;
        }
      }

    }
  }
  if (found) {
    const modifiedArguments = [found, ...[].slice.call(arguments, 1)];
    return originalResolveFilename.apply(this, modifiedArguments);
  } else {
    return originalResolveFilename.apply(this, arguments);
  }
};

function isFile(s) {
  try {
    return fs.statSync(s).isFile();
  } catch (_e) {
    return false;
  }
}

// Call the user-defined main.
require('${mainFile}');
`
}

const getPrefixLength = (pattern: string): number => {
  return pattern.substring(0, pattern.indexOf('*')).length
}
