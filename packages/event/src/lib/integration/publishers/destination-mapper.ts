import { LoggerProvider } from '@routineless/logging'

import { DomainEvent, EventType } from '../../domain'
import { EventBridgeDestination } from './impl/event-bridge-publisher'
import { SnsDestination } from './impl/sns-publisher'
import { SqsDestination } from './impl/sqs-publisher'

const logger = LoggerProvider.getLogger()

export type Destination = SnsDestination | SqsDestination | EventBridgeDestination

export interface EventDestinationMapper<T extends Destination> {
  map: (event: DomainEvent) => T
}

export type DestinationMapperResolver<T extends Destination> = () => EventDestinationMapper<T>

export type DestinationMappings = [EventType[], Destination][]

export class EventTypeDestinationMapper implements EventDestinationMapper<Destination> {
  private readonly mappings: Map<string, Destination> = new Map()
  private readonly defaultDestinationMapper: EventDestinationMapper<Destination> = createDefaultDestinationMapper()

  map(event: DomainEvent): Destination {
    let destination = this.mappings.get(event.type)
    if (!destination) {
      destination = this.defaultDestinationMapper.map(event)
    }
    return destination
  }

  registerMapping(mappings: DestinationMappings) {
    for (const [events, destination] of mappings) {
      for (const event of events) {
        this.mappings.set(event.getEventType(), destination)
      }
    }
  }
}

export const createDefaultDestinationMapper = (): EventDestinationMapper<Destination> => {
  const envEventBusName = process.env['EVENT_BUS_NAME']
  if (envEventBusName) {
    logger.debug(`EVENT_BUS_NAME:${envEventBusName} detected, using it as default destination mapper`)
    return { map: () => ({ EventBusName: envEventBusName }) }
  }
  const envSnsTopicArn = process.env['SNS_TOPIC_ARN']
  if (envSnsTopicArn) {
    logger.debug(`SNS_TOPIC_ARN:${envSnsTopicArn} detected, using it as default destination mapper`)
    return { map: () => ({ TopicArn: envSnsTopicArn }) }
  }
  const envSqsQueueUrl = process.env['SQS_QUEUE_URL']
  if (envSqsQueueUrl) {
    logger.debug(`SQS_QUEUE_URL:${envSqsQueueUrl} detected, using it as default destination mapper`)
    return { map: () => ({ QueueUrl: envSqsQueueUrl }) }
  }

  logger.info('No default event destination mapper resolved.')
  return {
    map: (event: DomainEvent) => {
      throw new Error(`Failed to resolve destination for: ${event.type}`)
    },
  }
}
