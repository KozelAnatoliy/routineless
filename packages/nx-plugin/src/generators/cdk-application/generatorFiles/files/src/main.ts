import * as cdk from 'aws-cdk-lib'

import { environment } from './environment'
import { PersistanceStack } from './stacks/persistanceStack'
import type { BaseStackPorps } from './types/baseStackProps'

const baseStackProps: BaseStackPorps = { env: environment }
const app = new cdk.App()

new PersistanceStack(app, `Persistance`, { ...baseStackProps })
