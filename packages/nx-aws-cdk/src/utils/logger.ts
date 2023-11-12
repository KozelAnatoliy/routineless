import { createLogger, format, transports } from 'winston'

const logger = createLogger({
  level: process.env['ROUTINELESS_LOG_LEVEL'] || 'info',
  format: format.combine(format.splat(), format.simple()),
  transports: [new transports.Console()],
})

export { logger }
