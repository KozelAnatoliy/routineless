import { randomUUID } from 'crypto'
import util from 'util'

import { DomainEventPublisherFactory } from '../integration'
import { InitializedIBuilder, builder } from './builder'
import type { ClassType } from './types'

const domainEventPublisher = DomainEventPublisherFactory.getPublisher()

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

  public readonly id: string
  public readonly type: string
  public readonly timestamp: number
  public readonly traceId?: string
  public readonly source?: string

  constructor(event: DomainEvent) {
    this.type = BaseDomainEvent.getEventType()
    this.id = randomUUID()
    this.timestamp = Date.now()
    if (event.source) this.source = event.source
    if (event.traceId) this.traceId = event.traceId
  }

  public static [util.inspect.custom](): string {
    return this.toString()
  }

  public static toString(): string {
    return this.getEventType()
  }

  public static getEventType(): string {
    return this.EVENT_TYPE
  }

  public static builder<T extends typeof BaseDomainEvent>(this: T) {
    const builderInstance = builder(this, (event) => domainEventPublisher.publish(event))
      .setId(randomUUID())
      .setTimestamp(Date.now())
      .setType(this.getEventType())
      .setSource(process.env['AWS_LAMBDA_FUNCTION_NAME'] || 'UNSPECIFIED')

    return builderInstance as unknown as InitializedIBuilder<InstanceType<T>, 'id' | 'timestamp' | 'type'>
  }

  public is<R extends DomainEvent>(eventType: EventType<R>): this is R {
    return this.type === eventType.getEventType()
  }
}
