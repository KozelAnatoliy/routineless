import { randomUUID } from 'crypto'

import { InitializedIBuilder, builder } from './builder'
import type { ClassType } from './types'

export type EventType<T extends DomainEvent = DomainEvent> = ClassType<T> & {
  getEventType(): string
}

export interface DomainEvent {
  readonly id: string
  readonly type: string
  readonly timestamp: number
  readonly traceId?: string
  readonly source?: string
  is<R extends DomainEvent>(eventType: EventType<R>): this is R
}

export class BaseDomainEvent implements DomainEvent {
  protected static readonly EVENT_TYPE: string = 'BASE_DOMAIN_EVENT'

  public readonly id: string = randomUUID()
  public readonly type: string = BaseDomainEvent.getEventType()
  public readonly timestamp: number = Date.now()
  public readonly traceId?: string
  public readonly source?: string

  constructor(event: DomainEvent) {
    if (event.source) this.source = event.source
    if (event.traceId) this.traceId = event.traceId
  }

  public is<R extends DomainEvent>(eventType: EventType<R>): this is R {
    return this.type === eventType.getEventType()
  }

  public static getEventType(): string {
    return this.EVENT_TYPE
  }

  public static builder<T extends typeof BaseDomainEvent>(this: T) {
    const builderInstance = builder(this)
      .setId(randomUUID())
      .setTimestamp(Date.now())
      .setType(this.getEventType())
      .setSource(process.env['AWS_LAMBDA_FUNCTION_NAME'] || 'UNSPECIFIED')

    return builderInstance as unknown as InitializedIBuilder<InstanceType<T>, 'id' | 'timestamp' | 'type'>
  }
}
