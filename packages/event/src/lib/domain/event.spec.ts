import { BaseDomainEvent, DomainEvent } from './event'

class TestEvent extends BaseDomainEvent {
  protected static override readonly EVENT_TYPE = 'TEST_EVENT'

  public override readonly type = TestEvent.EVENT_TYPE
  public readonly testData: string

  constructor(event: TestEvent) {
    super(event)
    this.testData = event.testData
  }
}

class AnotherTestEvent extends BaseDomainEvent {
  protected static override readonly EVENT_TYPE = 'ANOTHER_TEST_EVENT'

  public override readonly type = AnotherTestEvent.EVENT_TYPE
  public readonly anoterTestData: string

  constructor(event: AnotherTestEvent) {
    super(event)
    this.anoterTestData = event.anoterTestData
  }
}

class EmptyEvent extends BaseDomainEvent {
  protected static override readonly EVENT_TYPE = 'EMPTY_EVENT'

  public override readonly type = EmptyEvent.EVENT_TYPE
}

describe('BaseDomainEvent', () => {
  it('should build custom event', () => {
    const event: DomainEvent = TestEvent.builder().setSource('test_event_source').setTestData('test_data').build()

    expect(event).toEqual({
      id: expect.any(String),
      source: 'test_event_source',
      timestamp: expect.any(Number),
      type: 'TEST_EVENT',
      testData: 'test_data',
    })
    if (event.is(TestEvent)) {
      expect(event.testData).toBe('test_data')
    }
    expect(event.is(TestEvent)).toBe(true)
    expect(TestEvent.getEventType()).toBe('TEST_EVENT')
    expect(event.is(AnotherTestEvent)).toBe(false)
    expect(AnotherTestEvent.getEventType()).toBe('ANOTHER_TEST_EVENT')
  })

  it('should build empty event', () => {
    const event: DomainEvent = EmptyEvent.builder().build()

    expect(event).toEqual({
      id: expect.any(String),
      source: 'UNSPECIFIED',
      timestamp: expect.any(Number),
      type: 'EMPTY_EVENT',
    })
  })

  it('should print event type on toString', () => {
    expect(`${EmptyEvent}`).toBe('EMPTY_EVENT')
  })
})
