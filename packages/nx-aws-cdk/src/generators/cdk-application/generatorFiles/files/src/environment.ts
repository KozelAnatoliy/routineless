import type { CdkEnvironment, Mutable } from '@routineless/cdk'

export const DEFAULT_ENV = 'local'

const mutableEnvironment: Mutable<CdkEnvironment> = {
  envName: process.env['AWS_ENV'] || DEFAULT_ENV,
}

if (process.env['AWS_ACCOUNT']) {
  mutableEnvironment.account = process.env['AWS_ACCOUNT']
}
if (process.env['AWS_REGION']) {
  mutableEnvironment.region = process.env['AWS_REGION']
}

export const environment = mutableEnvironment

export const localEnv: CdkEnvironment = {
  envName: DEFAULT_ENV,
}
