import { BaseDomainEvent } from '../../domain'
import { EventTypeDestinationMapper } from './destination-mapper'

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

describe('DestinationMapper', () => {
  const mapper = new EventTypeDestinationMapper()

  mapper.registerMapping([
    [[TestEvent, AnotherTestEvent], { TopicArn: 'topicArn' }],
    [[BaseDomainEvent], { QueueUrl: 'queueUrl' }],
  ])

  it('should map event to destination', () => {
    console.log([
      [[TestEvent, AnotherTestEvent], { TopicArn: 'topicArn' }],
      [[BaseDomainEvent], { QueueUrl: 'queueUrl' }],
    ])
  })
})
