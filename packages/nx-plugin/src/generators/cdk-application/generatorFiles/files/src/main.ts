import * as cdk from 'aws-cdk-lib'

import { environment } from './environment'
import { PersistanceStack } from './stacks/persistance'
import type { BaseStackProps } from './types/base-stack-props'

const baseStackProps: BaseStackProps = { env: environment }
const app = new cdk.App()

new PersistanceStack(app, 'Persistance', { ...baseStackProps })
