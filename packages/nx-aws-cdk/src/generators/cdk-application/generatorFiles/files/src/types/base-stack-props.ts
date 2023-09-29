import type { StackProps } from 'aws-cdk-lib'

import type { CdkEnvironment } from '../environment'

export interface BaseStackProps extends StackProps {
  readonly env: CdkEnvironment
}
