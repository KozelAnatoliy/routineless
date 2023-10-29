import type { Context, Handler } from 'aws-lambda'

export const handler: Handler = async (event: any, context: Context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event, context, message: 'Hello World' }),
  }
}
