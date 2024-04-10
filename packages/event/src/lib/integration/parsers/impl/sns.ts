import { logger } from '@routineless/logging'
import type { SNSEvent } from 'aws-lambda'

import { DomainEventParser, ParserOutput, isDomainEvent } from '../parser'

export class SnsDomainEventParser implements DomainEventParser<SNSEvent> {
  public parse(event: SNSEvent): ParserOutput {
    if (!this.isSnsEvent(event)) {
      return { canParse: false, output: undefined }
    }
    const firstRecord = event.Records[0]
    if (!firstRecord) {
      return { canParse: true, output: undefined }
    }

    try {
      const parsedObject = JSON.parse(firstRecord.Sns.Message)
      return { canParse: true, output: isDomainEvent(parsedObject) ? parsedObject : undefined }
    } catch (err) {
      logger.error('Error parsing SNS message', { err })
      return { canParse: true, output: undefined }
    }
  }

  private isSnsEvent(event: any): event is SNSEvent {
    if (typeof event !== 'object' || event?.Records?.length != 1 || !event.Records[0].Sns?.Message) {
      logger.debug('SnsDomainEventParser does not match input event')
      return false
    }
    return true
  }
}
