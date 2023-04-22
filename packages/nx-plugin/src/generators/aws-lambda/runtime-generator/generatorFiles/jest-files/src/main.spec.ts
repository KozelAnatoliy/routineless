import type { Context } from 'aws-lambda'

import { handler } from './main'

describe('handler', () => {
  const testContext: Context = { awsRequestId: '123' } as Context

  it('should return incoming event', async () => {
    const event = { foo: 'bar' }
    const response = await handler({ foo: 'bar' }, testContext, jest.fn())

    expect(response.statusCode).toEqual(200)
    expect(response.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(response.body).toEqual(JSON.stringify({ event, context: testContext, message: 'Hello World' }))
  })
})
