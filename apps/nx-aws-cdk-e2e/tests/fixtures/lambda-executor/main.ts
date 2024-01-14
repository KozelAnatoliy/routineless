import { directInternal } from '@proj/direct-internal'
import type { Context, Handler } from 'aws-lambda'

import { getSqrt } from './app/math'

type Event = {
  input: number
}

export const handler: Handler = async (event: Event, context: Context) => {
  const message = `lambda handler. ${event.input} sqrt is ${getSqrt(event.input)}. ${directInternal(event.input)}`
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event, context, message: message }),
  }
}
