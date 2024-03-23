import { LoggerProvider } from '@routineless/logging'

import { DomainEvent } from '../../domain'
import {
  Destination,
  DestinationMapperResolver,
  DestinationMappings,
  EventDestinationMapper,
  EventTypeDestinationMapper,
  createDefaultDestinationMapper,
} from './destination-mapper'
import { EventBridgeDestination, EventBridgeEventPublisher } from './impl/event-bridge-publisher'
import { SnsDestination, SnsEventPublisher } from './impl/sns-publisher'
import { SqsDestination, SqsEventPublisher } from './impl/sqs-publisher'

const logger = LoggerProvider.getLogger()

export interface DomainEventPublisher {
  publish(...events: DomainEvent[]): Promise<PublisherOutput>
}

export interface DomainEventPublisherImpl<D extends Destination> extends DomainEventPublisher {
  supports(destination: Destination): destination is D
}

export type PublihserOutputEntry = {
  id: string
  type: string
  destination: Destination
  assignedId?: string
  errorMessage?: string
  errorCode?: string
}

export type PublisherOutput = {
  failedEventsCount: number
  entries: PublihserOutputEntry[]
}

export const reducePublisherOutput = (outputs: PublisherOutput[]): PublisherOutput => {
  return outputs.reduce(
    (result, output) => {
      result.failedEventsCount += output.failedEventsCount
      result.entries.push(...output.entries)
      return result
    },
    { failedEventsCount: 0, entries: [] },
  )
}

export class DomainEventPublisherFactory {
  private static domainEventPublisher: DomainEventPublisher
  private static destinationMapper: EventDestinationMapper<Destination>

  public static getPublisher(): DomainEventPublisher {
    if (!this.destinationMapper) {
      logger.debug('No destination mapper found, creating default destination mapper')
      this.destinationMapper = createDefaultDestinationMapper()
    }
    if (!this.domainEventPublisher) {
      const destinationMapperResolver = () => this.destinationMapper
      this.domainEventPublisher = new CompositeEventPublisher(
        [
          new EventBridgeEventPublisher(destinationMapperResolver as DestinationMapperResolver<EventBridgeDestination>),
          new SnsEventPublisher(destinationMapperResolver as DestinationMapperResolver<SnsDestination>),
          new SqsEventPublisher(destinationMapperResolver as DestinationMapperResolver<SqsDestination>),
        ],
        destinationMapperResolver,
      )
    }
    return this.domainEventPublisher
  }

  public static registerDestinationMappings(mappings: DestinationMappings) {
    logger.debug('Registering destination mappings: %j', mappings)
    if (!this.destinationMapper || !(this.destinationMapper instanceof EventTypeDestinationMapper)) {
      this.destinationMapper = new EventTypeDestinationMapper()
    }
    const eventTypeDestinationMapper = this.destinationMapper as EventTypeDestinationMapper
    eventTypeDestinationMapper.registerMapping(mappings)
  }
}

class CompositeEventPublisher implements DomainEventPublisher {
  private readonly publishers: DomainEventPublisherImpl<Destination>[]
  private readonly destinationMapperResolver: DestinationMapperResolver<Destination>

  constructor(
    publishers: DomainEventPublisherImpl<Destination>[],
    destinationMapperResolver: DestinationMapperResolver<Destination>,
  ) {
    this.publishers = publishers
    this.destinationMapperResolver = destinationMapperResolver
  }

  public async publish(...events: DomainEvent[]): Promise<PublisherOutput> {
    const publisherEventsMap = events.reduce((acc, event) => {
      const destination = this.destinationMapperResolver().map(event)
      const resolvedPublisher = this.publishers.find((publisher) => publisher.supports(destination))
      if (!resolvedPublisher) {
        throw new Error(`Failed to resolve publisher for destination: ${destination}. event: ${event}`)
      }
      if (!acc.has(resolvedPublisher)) {
        acc.set(resolvedPublisher, [])
      }
      acc.get(resolvedPublisher)!.push(event)
      return acc
    }, new Map<DomainEventPublisherImpl<Destination>, DomainEvent[]>())

    const publishPromises = []
    for (const [publisher, events] of publisherEventsMap) {
      publishPromises.push(publisher.publish(...events))
    }

    return Promise.all(publishPromises).then((results) => reducePublisherOutput(results))
  }
}
