import { Logger } from '@aws-lambda-powertools/logger'

import { defaultValues, serviceName } from './common'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent' | 'critical'

const logger = new Logger({
  logLevel: (process.env['LOG_LEVEL'] as LogLevel) || 'info',
  serviceName,
  persistentLogAttributes: {
    ...defaultValues,
    region: process.env['AWS_REGION'] || 'N/A',
  },
  environment: process.env['APP_ENV'] || 'N/A',
})

export { logger }
