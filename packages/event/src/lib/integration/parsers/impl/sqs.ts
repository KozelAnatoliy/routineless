import { logger } from '@routineless/logging'
import type { SQSEvent } from 'aws-lambda'

import { DomainEventParser, ParserOutput, isDomainEvent } from '../parser'

export class SqsDomainEventParser implements DomainEventParser<SQSEvent> {
  public parse(event: SQSEvent): ParserOutput {
    if (!this.isSqsEvent(event)) {
      return { canParse: false, output: undefined }
    }
    const firstRecord = event.Records[0]
    if (!firstRecord) {
      return { canParse: true, output: undefined }
    }

    try {
      const parsedObject = JSON.parse(firstRecord.body)
      return { canParse: true, output: isDomainEvent(parsedObject) ? parsedObject : undefined }
    } catch (err) {
      logger.error('Error parsing SQS message', { err })
      return { canParse: true, output: undefined }
    }
  }

  public isSqsEvent(event: any): event is SQSEvent {
    if (
      typeof event !== 'object' ||
      event?.Records?.length != 1 ||
      !event.Records[0].body ||
      !event.Records[0].messageId
    ) {
      logger.debug('SqsDomainEventParser does not match input event')
      return false
    }
    return true
  }
}
