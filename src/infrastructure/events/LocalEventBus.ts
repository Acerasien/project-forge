import { EventEmitter } from 'events'
import { DomainEventBus } from '../../domain/events/DomainEventBus'
import { DomainEvent, DomainEventType } from '../../domain/events/DomainEvent'

export class LocalEventBus implements DomainEventBus {
  private readonly emitter = new EventEmitter()

  publish(event: DomainEvent): void {
    // Asynchronous dispatch to decouple the publisher from the subscribers
    Promise.resolve()
      .then(() => {
        this.emitter.emit(event.type, event)
      })
      .catch((err) => {
        console.error('Error dispatching event:', err)
      })
  }

  subscribe<T extends DomainEvent>(
    eventType: DomainEventType,
    handler: (event: T) => void | Promise<void>
  ): void {
    this.emitter.on(eventType, async (event: T) => {
      try {
        await handler(event)
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error)
      }
    })
  }
}
