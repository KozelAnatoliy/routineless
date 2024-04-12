import { Logger } from '@aws-lambda-powertools/logger'

import { serviceName } from './common'
import { RoutinelessLogFormatter } from './formatters/routineless'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent' | 'critical'

const logger = new Logger({
  logFormatter: new RoutinelessLogFormatter(),
  logLevel: (process.env['LOG_LEVEL'] as LogLevel) || 'info',
  serviceName,
  environment: process.env['APP_ENV'] || 'N/A',
})

export { logger }
