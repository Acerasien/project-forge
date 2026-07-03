import { DomainEvent, DomainEventType } from './DomainEvent'

export interface DomainEventBus {
  publish(event: DomainEvent): void
  subscribe<T extends DomainEvent>(
    eventType: DomainEventType,
    handler: (event: T) => void | Promise<void>
  ): void
}
