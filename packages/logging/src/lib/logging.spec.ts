import { Logger } from 'winston'

import { TestTransport } from '../testing/logger'
import { LoggerProvider } from './logging'

describe('logger format check', () => {
  let logger: Logger

  beforeEach(() => {
    logger = LoggerProvider.getLogger()
  })

  it('should return same logger instance for multiple calls', () => {
    expect(logger).toBeDefined()
    expect(logger.log).toBeDefined()

    const secondInstance = LoggerProvider.getLogger()
    expect(logger === secondInstance).toBeTruthy()
  })

  it('should format meta object', (done) => {
    const testTransport = new TestTransport()
    logger.add(testTransport)
    logger.on('close', () => {
      const loggedStatements = testTransport.getLoggedStatements()
      expect(loggedStatements.length).toBe(1)
      expect(loggedStatements[0]!.message).toEqual('test {"id":1,"text":"text"} message')

      logger.remove(testTransport)
      done()
    })

    logger.info('test %j message', { id: 1, text: 'text' })
    logger.close()
  })

  it('should format meta string', (done) => {
    const testTransport = new TestTransport()
    logger.add(testTransport)
    logger.on('close', () => {
      const loggedStatements = testTransport.getLoggedStatements()
      expect(loggedStatements.length).toBe(1)
      expect(loggedStatements[0]!.message).toEqual('test message string')

      logger.remove(testTransport)
      done()
    })

    logger.info('test %s string', 'message')
    logger.close()
  })
})
