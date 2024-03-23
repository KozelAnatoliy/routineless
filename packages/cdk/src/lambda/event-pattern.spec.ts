import { BaseDomainEvent } from '@routineless/event'

import { getEventBridgeDestinationResponseEventPattern, getEventBridgeEventPattern } from './event-pattern'

class TestEvent extends BaseDomainEvent {}
class AnotherTestEvent extends BaseDomainEvent {}

describe('event-patterns', () => {
  describe('getEventBridgeEventPattern', () => {
    it('should create event bridge pattern for single type', () => {
      const eventPattern = getEventBridgeEventPattern(TestEvent)
      expect(eventPattern.detailType).toEqual(['TEST_EVENT'])
    })

    it('should create event bridge pattern for type array', () => {
      const eventPattern = getEventBridgeEventPattern(TestEvent, AnotherTestEvent)
      expect(eventPattern.detailType).toEqual(['TEST_EVENT', 'ANOTHER_TEST_EVENT'])
    })
  })

  describe('getEventBridgeDestinationResponseEventPattern', () => {
    it('should create event bridge destination event pattern for single type', () => {
      const eventPattern = getEventBridgeDestinationResponseEventPattern(TestEvent)
      expect(eventPattern.detail?.['responsePayload']?.type).toEqual(['TEST_EVENT'])
    })

    it('should create event bridge destination event pattern for type array', () => {
      const eventPattern = getEventBridgeDestinationResponseEventPattern(TestEvent, AnotherTestEvent)
      expect(eventPattern.detail?.['responsePayload']?.type).toEqual(['TEST_EVENT', 'ANOTHER_TEST_EVENT'])
    })
  })
})
