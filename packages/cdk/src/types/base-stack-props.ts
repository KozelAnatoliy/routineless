import type { Environment, StackProps } from 'aws-cdk-lib'

export interface CdkEnvironment extends Environment {
  readonly envName: string
}

export interface BaseStackProps extends StackProps {
  readonly env: CdkEnvironment
}
