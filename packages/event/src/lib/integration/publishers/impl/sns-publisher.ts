import { PublishBatchCommand, PublishBatchCommandInput } from '@aws-sdk/client-sns'
import { AwsClientFactory } from '@routineless/aws-sdk'
import { logger } from '@routineless/logging'

import { DomainEvent } from '../../../domain'
import { Destination, DestinationMapperResolver } from '../destination-mapper'
import { DomainEventPublisherImpl, PublisherOutput, reducePublisherOutput } from '../publisher'
import { chunkify, mapResult, reduceEventsByDestination } from './message-publishers-util'

export type SnsDestination = {
  TopicArn: string
}

export class SnsEventPublisher implements DomainEventPublisherImpl<SnsDestination> {
  private static readonly MAX_BATCH_SIZE = 10
  private readonly eventDestinationMapperResolver: DestinationMapperResolver<SnsDestination>

  constructor(eventDestinationMapperResolver: DestinationMapperResolver<SnsDestination>) {
    this.eventDestinationMapperResolver = eventDestinationMapperResolver
  }
  supports(destination: Destination): destination is SnsDestination {
    return (destination as SnsDestination).TopicArn !== undefined
  }

  public async publish(...events: DomainEvent[]): Promise<PublisherOutput> {
    const eventsByDestination = reduceEventsByDestination(events, this.eventDestinationMapperResolver())

    const eventsChunksByDetination = new Map<SnsDestination, DomainEvent[][]>()
    for (const [destination, events] of eventsByDestination) {
      const chunks = chunkify(events, SnsEventPublisher.MAX_BATCH_SIZE)
      eventsChunksByDetination.set(destination, chunks)
    }

    const sendPromises: Promise<PublisherOutput>[] = []
    for (const [destination, chunks] of eventsChunksByDetination) {
      for (const chunk of chunks) {
        const command = this.createPublishBatchCommand(chunk, destination)
        logger.debug('publishing domain events', { command })
        sendPromises.push(
          AwsClientFactory.getSnsClient()
            .send(command)
            .then((output) => mapResult(output, chunk, this.eventDestinationMapperResolver())),
        )
      }
    }

    return Promise.all(sendPromises).then((results) => reducePublisherOutput(results))
  }

  private createPublishBatchCommand(events: DomainEvent[], destination: SnsDestination): PublishBatchCommand {
    const commandInput: PublishBatchCommandInput = {
      TopicArn: destination.TopicArn,
      PublishBatchRequestEntries: events.map((event) => ({
        Id: event.id,
        Message: JSON.stringify(event),
      })),
    }
    return new PublishBatchCommand(commandInput)
  }
}
