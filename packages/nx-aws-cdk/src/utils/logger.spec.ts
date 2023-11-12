import { Format } from 'logform'
import { createLogger, format, transports } from 'winston'

jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    simple: jest.fn(),
    splat: jest.fn(),
    combine: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}))

const mockedSimpleFormat = jest.mocked(format.simple)
const mockedSplatFormat = jest.mocked(format.splat)
const mockedCombineFormat = jest.mocked(format.combine)
const mockedConsoleTransport = jest.mocked(transports.Console)

describe('logging', () => {
  const OLD_ENV = process.env
  const simpleFormat = 'simple-format'
  const splatFormat = 'splat-format'

  beforeEach(() => {
    mockedSimpleFormat.mockReturnValue(simpleFormat as unknown as Format)
    mockedSplatFormat.mockReturnValue(splatFormat as unknown as Format)
    mockedCombineFormat.mockReturnValue([splatFormat, simpleFormat] as unknown as Format)
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('should create logger with default log level', async () => {
    jest.isolateModules(async () => {
      await import('./logger')

      expect(mockedSimpleFormat).toHaveBeenCalled()
      expect(mockedSplatFormat).toHaveBeenCalled()
      expect(mockedCombineFormat).toHaveBeenCalledWith(splatFormat, simpleFormat)
      expect(createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          format: [splatFormat, simpleFormat],
        }),
      )
      expect(mockedConsoleTransport).toHaveBeenCalled()
    })
  })

  it('should create logger with log level from env', async () => {
    jest.isolateModules(async () => {
      process.env['ROUTINELESS_LOG_LEVEL'] = 'debug'
      await require('./logger')

      expect(createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          format: [splatFormat, simpleFormat],
        }),
      )
      expect(mockedConsoleTransport).toHaveBeenCalled()
    })
  })
})
