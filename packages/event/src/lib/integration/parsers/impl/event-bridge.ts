import { LoggerProvider } from '@routineless/logging'
import type { EventBridgeEvent } from 'aws-lambda'

import { DomainEvent } from '../../../domain/event'
import { DomainEventParser, ParserOutput, isDomainEvent } from '../parser'

const logger = LoggerProvider.getLogger()

export class EventBridgeEventParser implements DomainEventParser<EventBridgeEvent<string, DomainEvent>> {
  public parse(event: EventBridgeEvent<string, DomainEvent>): ParserOutput {
    if (!this.isEventBridgeEvent(event)) {
      return { canParse: false, output: undefined }
    }

    return {
      canParse: true,
      output: isDomainEvent(event.detail) ? event.detail : undefined,
    }
  }

  public isEventBridgeEvent(event: any): event is EventBridgeEvent<string, DomainEvent> {
    if (!event?.detail) {
      logger.debug('EventBridgeEventParser does not match input event')
      return false
    }
    return true
  }
}

export class EventBridgeDestinationEventParser implements DomainEventParser<EventBridgeEvent<string, any>> {
  public parse(event: EventBridgeEvent<string, any>): ParserOutput {
    if (!this.isEventBridgeDestinationEvent(event)) {
      return { canParse: false, output: undefined }
    }

    return {
      canParse: true,
      output: isDomainEvent(event.detail.responsePayload) ? event.detail.responsePayload : undefined,
    }
  }

  public isEventBridgeDestinationEvent(event: any): event is EventBridgeEvent<string, any> {
    if (!event?.detail?.responsePayload) {
      logger.debug('EventBridgeDestinationEventParser does not match input event')
      return false
    }
    return true
  }
}
