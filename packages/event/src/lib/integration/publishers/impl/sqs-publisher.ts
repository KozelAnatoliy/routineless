import { SendMessageBatchCommand, SendMessageBatchCommandInput } from '@aws-sdk/client-sqs'
import { AwsClientFactory } from '@routineless/aws-sdk'
import { LoggerProvider } from '@routineless/logging'

import { DomainEvent } from '../../../domain'
import { Destination, DestinationMapperResolver } from '../destination-mapper'
import { DomainEventPublisherImpl, PublisherOutput, reducePublisherOutput } from '../publisher'
import { chunkify, mapResult, reduceEventsByDestination } from './message-publishers-util'

const logger = LoggerProvider.getLogger()

export type SqsDestination = {
  QueueUrl: string
}

export class SqsEventPublisher implements DomainEventPublisherImpl<SqsDestination> {
  private static readonly MAX_BATCH_SIZE = 10
  private readonly eventDestinationMapperResolver: DestinationMapperResolver<SqsDestination>

  constructor(eventDestinationMapperResolver: DestinationMapperResolver<SqsDestination>) {
    this.eventDestinationMapperResolver = eventDestinationMapperResolver
  }
  supports(destination: Destination): destination is SqsDestination {
    return (destination as SqsDestination).QueueUrl !== undefined
  }

  public async publish(...events: DomainEvent[]): Promise<PublisherOutput> {
    const eventsByDestination = reduceEventsByDestination(events, this.eventDestinationMapperResolver())

    const eventsChunksByDetination = new Map<SqsDestination, DomainEvent[][]>()
    for (const [destination, events] of eventsByDestination) {
      const chunks = chunkify(events, SqsEventPublisher.MAX_BATCH_SIZE)
      eventsChunksByDetination.set(destination, chunks)
    }

    const sendPromises: Promise<PublisherOutput>[] = []
    for (const [destination, chunks] of eventsChunksByDetination) {
      for (const chunk of chunks) {
        const command = this.createSendMessageBatchCommand(chunk, destination)
        logger.debug('publishing domain events: %j', command)
        sendPromises.push(
          AwsClientFactory.getSqsClient()
            .send(command)
            .then((output) => mapResult(output, chunk, this.eventDestinationMapperResolver())),
        )
      }
    }

    return Promise.all(sendPromises).then((results) => reducePublisherOutput(results))
  }

  private createSendMessageBatchCommand(events: DomainEvent[], destination: SqsDestination): SendMessageBatchCommand {
    const commandInput: SendMessageBatchCommandInput = {
      QueueUrl: destination.QueueUrl,
      Entries: events.map((event) => ({
        Id: event.id,
        MessageBody: JSON.stringify(event),
      })),
    }
    return new SendMessageBatchCommand(commandInput)
  }
}
