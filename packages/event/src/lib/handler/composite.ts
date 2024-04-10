import { logger } from '@routineless/logging'

import { BaseEventHandler } from './base'

export class CompositeEventHandler<T, U> {
  private readonly handlers: BaseEventHandler<T, U>[]

  protected constructor() {
    this.handlers = []
  }

  public static register<T, U>(handler: BaseEventHandler<T, U>): CompositeEventHandler<T, U> {
    return new CompositeEventHandler().register(handler)
  }

  public async process(event: T): Promise<void> {
    const applicableHandlers = this.handlers.filter((handler) => handler.canProcess(event))

    if (applicableHandlers.length === 0) {
      logger.warn('No handler found for event', { event })
      return
    }

    await Promise.all(applicableHandlers.map((handler) => handler.process(event)))
  }

  public register(handler: BaseEventHandler<T, U>): this {
    this.handlers.push(handler)
    return this
  }
}
