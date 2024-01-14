#!/usr/bin/env node
import { CreateWorkspaceOptions, createWorkspace } from 'create-nx-workspace'
import yargs from 'yargs'

import packageJson from '../package.json'

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
    .option('nxCloud', {
      choices: ['yes', 'github', 'circleci', 'skip'],
      describe: 'Connect the workspace to the free tier of the distributed cache provided by Nx Cloud.',
      default: 'skip',
    })
    .alias('u', 'unitTestRunner')
    .describe('u', 'Test runner to use for unit tests. Acceptable values: jest, none')
    .default('u', 'jest')
    .help('h')
    .alias('h', 'help').argv
  const name = argv._[0] as string

  console.log(`Creating the workspace: ${name}`)

  const presetName = '@routineless/nx-aws-cdk'
  const presetVersion = packageJson.version

  const { directory } = await createWorkspace(`${presetName}@${presetVersion}`, {
    i: argv['i'],
    l: argv['l'],
    unitTestRunner: argv['u'],
    nxCloud: argv.nxCloud as CreateWorkspaceOptions['nxCloud'],
    name,
    packageManager: 'npm',
    commit: {
      name: '',
      email: '',
      message: 'Initial commit',
    },
  })

  console.log(`Successfully created the workspace: ${directory}.`)
}

main()
