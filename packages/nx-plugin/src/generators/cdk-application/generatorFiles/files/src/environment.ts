import type { Environment } from 'aws-cdk-lib'

export const DEFAULT_REGION = 'us-east-1'
export const DEFAULT_ACCOUNT = '000000000000'
export const DEFAULT_ENV = 'local'

export interface CdkEnvironment extends Environment {
  readonly account: string
  readonly region: string
  readonly envName: string
}

export const environment: CdkEnvironment = {
  envName: process.env['AWS_ENV'] || DEFAULT_ENV,
  account: process.env['AWS_ACCOUNT'] || DEFAULT_ACCOUNT,
  region: process.env['AWS_REGION'] || DEFAULT_REGION,
}

export const localEnv: CdkEnvironment = {
  envName: DEFAULT_ENV,
  account: DEFAULT_ACCOUNT,
  region: DEFAULT_REGION,
}
