import { BaseDomainEvent } from '../domain'
import { BaseDomainEventHandler } from './base'

class UserCreated extends BaseDomainEvent {
  protected static override readonly EVENT_TYPE = 'USER_CREATED'

  public readonly userId: string
  public override readonly type = UserCreated.EVENT_TYPE

  constructor(event: UserCreated) {
    super(event)
    this.userId = event.userId
  }
}

class UserDeleted extends BaseDomainEvent {
  protected static override readonly EVENT_TYPE = 'USER_DELETED'

  public override readonly type = UserDeleted.EVENT_TYPE
  public readonly userId: string

  constructor(event: UserDeleted) {
    super(event)
    this.userId = event.userId
  }
}

class UserEventHandler extends BaseDomainEventHandler {
  constructor(private readonly handlerTracker: Map<string, number>) {
    super()
    this.register(UserCreated, this.handleUserCreated)
    this.register(UserDeleted, this.handleUserDeleted)
  }

  private async handleUserCreated(event: UserCreated): Promise<void> {
    this.handlerTracker.set(event.type, (this.handlerTracker.get(event.type) || 0) + 1)
  }

  private async handleUserDeleted(event: UserDeleted): Promise<void> {
    this.handlerTracker.set(event.type, (this.handlerTracker.get(event.type) || 0) + 1)
  }
}

describe('BaseDomainEventHandler', () => {
  const handlerTracker = new Map<string, number>()
  const userEventHandler = new UserEventHandler(handlerTracker)

  it('should process user created event', async () => {
    const event = UserCreated.builder().setUserId('user_id').build()
    expect(handlerTracker.has(UserCreated.getEventType())).toBeFalsy()

    await userEventHandler.process(event)

    expect(handlerTracker.get(UserCreated.getEventType())).toBe(1)

    await userEventHandler.process(event)

    expect(handlerTracker.get(UserCreated.getEventType())).toBe(2)
    expect(handlerTracker.has(UserDeleted.getEventType())).toBeFalsy()
  })

  it('should process user deleted event', async () => {
    const event = UserDeleted.builder().setUserId('user_id').build()
    expect(handlerTracker.has(UserDeleted.getEventType())).toBeFalsy()

    await userEventHandler.process(event)

    expect(handlerTracker.get(UserDeleted.getEventType())).toBe(1)
  })
})
