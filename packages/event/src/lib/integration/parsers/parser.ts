import { logger } from '@routineless/logging'

import { BaseDomainEvent, DomainEvent } from '../../domain/event'
import { EventBridgeDestinationEventParser, EventBridgeEventParser } from './impl/event-bridge'
import { SnsDomainEventParser } from './impl/sns'
import { SqsDomainEventParser } from './impl/sqs'

export type ParserOutput = {
  canParse: boolean
  output: DomainEvent | undefined
}

export interface DomainEventParser<T> {
  parse(event: T): ParserOutput
}

class SimpleDomainEventParser implements DomainEventParser<unknown> {
  public parse(event: unknown): ParserOutput {
    if (!isDomainEvent(event)) {
      return { canParse: false, output: undefined }
    }
    return { canParse: true, output: event as DomainEvent }
  }
}

export class DomainEventParserFactory {
  private static eventParserChain: DomainEventParser<any>[] = [
    new SimpleDomainEventParser(),
    new SnsDomainEventParser(),
    new SqsDomainEventParser(),
    new EventBridgeDestinationEventParser(),
    new EventBridgeEventParser(),
  ]

  public static parse(event: unknown): DomainEvent | undefined {
    for (const parser of this.eventParserChain) {
      const parsedEvent = parser.parse(event)
      if (parsedEvent.canParse) {
        if (!parsedEvent.output) {
          logger.info('No domain event found', { event })
          return
        }
        return DomainEventParserFactory.fromDto(parsedEvent.output)
      }
    }
    logger.info('No parser found for event', { event })
    return
  }

  private static fromDto(dto: unknown): DomainEvent {
    const instance = Object.assign(Object.create(BaseDomainEvent.prototype), dto)
    return instance as DomainEvent
  }
}

export const isDomainEvent = (eventBody: unknown): boolean => {
  if (!eventBody) {
    return false
  }
  if (typeof eventBody !== 'object') {
    return false
  }
  const domainEvent = eventBody as DomainEvent
  if (!domainEvent.type || !domainEvent.id || !domainEvent.timestamp) return false
  return true
}
