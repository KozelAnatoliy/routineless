import { DEFAULT_ACCOUNT, DEFAULT_ENV, DEFAULT_REGION } from './environment'

describe('environment', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('should define properties from process env', async () => {
    process.env['AWS_ENV'] = 'test-env'
    process.env['AWS_ACCOUNT'] = 'test-account'
    process.env['AWS_REGION'] = 'test-region'
    const { environment } = await import('./environment')

    expect(environment).toEqual({
      envName: 'test-env',
      account: 'test-account',
      region: 'test-region',
    })
  })

  it('should default to local', async () => {
    delete process.env['AWS_ENV']
    delete process.env['AWS_ACCOUNT']
    delete process.env['AWS_REGION']
    const { environment } = await import('./environment')

    expect(environment).toEqual({
      envName: DEFAULT_ENV,
      account: DEFAULT_ACCOUNT,
      region: DEFAULT_REGION,
    })
  })
})
