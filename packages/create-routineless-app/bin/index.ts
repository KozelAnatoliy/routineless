#!/usr/bin/env node
import { createWorkspace } from 'create-nx-workspace'
import yargs from 'yargs'

async function main() {
  console.log(`Start Creating the workspace`)

  const argv = await yargs(process.argv.slice(2))
    .demandCommand(1, 1)
    .usage('Usage: npx $0 <workspace-name>')
    .example('$0 workspace', 'generages new routineless workspace')
    .alias('i', 'infra')
    .describe('i', 'infra application name')
    .alias('l', 'lambda')
    .describe('l', 'lambda application name')
    .boolean('nxCloud')
    .describe('nxCloud', 'Connect the workspace to the free tier of the distributed cache provided by Nx Cloud.')
    .default('nxCloud', false)
    .help('h')
    .alias('h', 'help').argv
  const name = argv._?.length ? (argv._[0] as string) : undefined
  if (!name) {
    throw new Error('Please provide a name for the workspace')
  }

  console.log(`Creating the workspace: ${name}`)

  // This assumes "@routineless/nx-plugin" and "create-routineless-app" are at the same version
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const presetVersion = require('../package.json').version

  const { directory } = await createWorkspace(`@routineless/nx-plugin@${presetVersion}`, {
    i: argv['i'],
    l: argv['l'],
    nxCloud: argv.nxCloud,
    name,
    packageManager: 'npm',
  })

  console.log(`Successfully created the workspace: ${directory}.`)
}

main()
