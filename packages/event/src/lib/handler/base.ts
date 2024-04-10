import { logger } from '@routineless/logging'

import { DomainEvent, EventType } from '../domain'

export abstract class BaseEventHandler<T, U> {
  protected readonly logger = logger
  private readonly map: Map<string, (event: any) => Promise<void>> = new Map()

  protected abstract getEventType(event: T): string

  protected abstract mapEventType(eventType: U): string

  canProcess<R extends T>(event: R): boolean {
    return this.map.has(this.getEventType(event))
  }

  process<R extends T>(event: R): Promise<void> {
    const processor = this.map.get(this.getEventType(event))
    if (!processor) {
      this.logger.error('No processor found for event', { event })
      throw new Error(`No processor found for event type ${this.getEventType(event)}`)
    }
    return processor(event)
  }

  protected register<R extends T>(eventType: U, processor: (event: R) => Promise<void>): this {
    this.map.set(this.mapEventType(eventType), processor.bind(this))
    return this
  }
}

export abstract class BaseDomainEventHandler<T extends DomainEvent = DomainEvent> extends BaseEventHandler<
  T,
  EventType<T>
> {
  protected getEventType(event: T): string {
    return event.type
  }

  protected mapEventType(eventType: EventType<T>): string {
    return eventType.getEventType()
  }

  protected override register<R extends T>(eventType: EventType<R>, processor: (event: R) => Promise<void>): this {
    return super.register(eventType, processor)
  }
}
