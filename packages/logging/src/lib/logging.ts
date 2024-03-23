import { format } from 'logform'
import { Logger, createLogger, transports } from 'winston'

export class LoggerProvider {
  private static readonly LOGGER_INSTANCE: Logger = this.initLogger()

  public static getLogger(): Logger {
    return this.LOGGER_INSTANCE
  }

  private static initLogger(): Logger {
    const logger = createLogger({
      level: process.env['LOG_LEVEL'] || 'info',
      format: format.combine(format.splat(), format.simple()),
      transports: [new transports.Console()],
    })

    return logger
  }
}

export const profile = async <T extends (...args: any[]) => any>(
  name: string,
  func: T,
  ...args: Parameters<T>
): Promise<ReturnType<T>> => {
  const start = process.hrtime()
  const result = await func(...args)
  const diff = process.hrtime(start)
  const nanoseconds = diff[0] * 1e9 + diff[1]
  LoggerProvider.getLogger().info(`${name} took ${formatTime(nanoseconds)}`)
  return result
}

const formatTime = (nanoseconds: number): string => {
  if (nanoseconds < 1e3) {
    return `${nanoseconds} nanoseconds`
  } else if (nanoseconds < 1e6) {
    return `${(nanoseconds / 1e3).toFixed(2)} microseconds`
  } else if (nanoseconds < 1e9) {
    return `${(nanoseconds / 1e6).toFixed(2)} milliseconds`
  } else {
    return `${(nanoseconds / 1e9).toFixed(2)} seconds`
  }
}
