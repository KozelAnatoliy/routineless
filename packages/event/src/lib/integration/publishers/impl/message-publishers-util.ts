import { PublishBatchCommandOutput } from '@aws-sdk/client-sns'
import { SendMessageBatchCommandOutput } from '@aws-sdk/client-sqs'

import { DomainEvent } from '../../../domain'
import { Destination, EventDestinationMapper } from '../destination-mapper'
import { PublihserOutputEntry, PublisherOutput } from '../publisher'

export const chunkify = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export const reduceEventsByDestination = <T extends Destination>(
  events: DomainEvent[],
  eventDestinationMapper: EventDestinationMapper<T>,
): Map<T, DomainEvent[]> => {
  const eventsByTargetTopic = new Map<T, DomainEvent[]>()
  for (const event of events) {
    const destination = eventDestinationMapper.map(event)
    if (!eventsByTargetTopic.has(destination)) {
      eventsByTargetTopic.set(destination, [])
    }
    eventsByTargetTopic.get(destination)!.push(event)
  }
  return eventsByTargetTopic
}

export const mapResult = <T extends Destination>(
  output: SendMessageBatchCommandOutput | PublishBatchCommandOutput,
  events: DomainEvent[],
  eventDestinationMapper: EventDestinationMapper<T>,
): PublisherOutput => {
  const eventMap = events.reduce((map, event) => map.set(event.id, event), new Map<string, DomainEvent>())
  const successEnties = (output.Successful || []).map((entry) => {
    const event = eventMap.get(entry.Id!)!
    const result: PublihserOutputEntry = {
      id: event.id,
      type: event.type,
      destination: eventDestinationMapper.map(event),
      assignedId: entry.MessageId!,
    }

    return result
  })
  const failedEnties = (output.Failed || []).map((entry) => {
    const event = eventMap.get(entry.Id!)!
    const result: PublihserOutputEntry = {
      id: event.id,
      type: event.type,
      destination: eventDestinationMapper.map(event),
    }
    if (entry.Code) {
      result.errorCode = entry.Code
    }
    if (entry.Message) {
      result.errorMessage = entry.Message
    }

    return result
  })
  return {
    failedEventsCount: output.Failed?.length || 0,
    entries: [...successEnties, ...failedEnties],
  }
}
