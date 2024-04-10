import {
  PutEventsCommand,
  PutEventsCommandInput,
  PutEventsCommandOutput,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge'
import { AwsClientFactory } from '@routineless/aws-sdk'
import { logger } from '@routineless/logging'

import { DomainEvent } from '../../../domain'
import { Destination, DestinationMapperResolver } from '../destination-mapper'
import { DomainEventPublisherImpl, PublihserOutputEntry, PublisherOutput } from '../publisher'

export type EventBridgeDestination = {
  EventBusName: string
}

export class EventBridgeEventPublisher implements DomainEventPublisherImpl<EventBridgeDestination> {
  private readonly eventDestinationMapperResolver: DestinationMapperResolver<EventBridgeDestination>

  constructor(eventDestinationMapperResolver: DestinationMapperResolver<EventBridgeDestination>) {
    this.eventDestinationMapperResolver = eventDestinationMapperResolver
  }

  supports(destination: Destination): destination is EventBridgeDestination {
    return (destination as EventBridgeDestination).EventBusName !== undefined
  }

  async publish(...events: DomainEvent[]): Promise<PublisherOutput> {
    const putEventsInput: PutEventsCommandInput = {
      Entries: events.map((event) => this.mapToEventBridgeEvent(event)),
    }
    const putEventCommand = new PutEventsCommand(putEventsInput)
    logger.debug('publishing domain events', { putEventCommand })
    const output = await AwsClientFactory.getEventBridgeClient().send(putEventCommand)

    return this.mapResult(output, events)
  }

  // otput entries indexes are the same as input
  private mapResult(output: PutEventsCommandOutput, events: DomainEvent[]): PublisherOutput {
    let failedEventsCount = 0
    const ouputEnties = (output.Entries || []).map((entry, index) => {
      const event = events[index]!
      const result: PublihserOutputEntry = {
        id: event.id,
        type: event.type,
        destination: this.eventDestinationMapperResolver().map(event),
      }
      if (entry.EventId) {
        result.assignedId = entry.EventId
      }
      if (entry.ErrorMessage && entry.ErrorCode) {
        failedEventsCount++
        result.errorMessage = entry.ErrorMessage
        result.errorCode = entry.ErrorCode
      }

      return result
    })
    return {
      failedEventsCount,
      entries: ouputEnties,
    }
  }

  private mapToEventBridgeEvent(event: DomainEvent): PutEventsRequestEntry {
    const eventBridgeEvent: PutEventsRequestEntry = {
      Time: new Date(event.timestamp),
      DetailType: event.type,
      Detail: JSON.stringify(event),
      EventBusName: this.eventDestinationMapperResolver().map(event).EventBusName,
    }
    if (event.source) {
      eventBridgeEvent.Source = event.source
    }
    // if (event.traceId) {
    //   eventBridgeEvent.TraceHeader = event.traceId
    // }

    return eventBridgeEvent
  }
}
