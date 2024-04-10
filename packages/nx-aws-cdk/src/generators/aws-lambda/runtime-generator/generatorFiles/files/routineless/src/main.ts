import type { LambdaInterface } from '@aws-lambda-powertools/commons/types'
import { logger, tracer } from '@routineless/logging'
import type { Context } from 'aws-lambda'

class Lambda implements LambdaInterface {
  @tracer.captureLambdaHandler()
  @logger.injectLambdaContext({ logEvent: process.env['APP_ENV'] !== 'prod' })
  public async handler(event: any, context: Context): Promise<any> {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, context, message: 'Hello World' }),
    }
  }
}

const handlerClass = new Lambda()
export const handler = handlerClass.handler.bind(handlerClass)
