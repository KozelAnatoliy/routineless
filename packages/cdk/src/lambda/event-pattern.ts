import { EventType } from '@routineless/event'
import { EventPattern } from 'aws-cdk-lib/aws-events'

export const getEventBridgeDestinationResponseEventPattern = (...events: EventType[]): EventPattern => {
  return {
    detail: {
      responsePayload: {
        type: events.map((event) => event.getEventType()),
      },
    },
  }
}

export const getEventBridgeEventPattern = (...events: EventType[]): EventPattern => {
  return {
    detailType: events.map((event) => event.getEventType()),
  }
}
