export enum DomainEventType {
  ArtifactApproved = 'ArtifactApproved',
  ArtifactNeedsReview = 'ArtifactNeedsReview',
  ArtifactEdited = 'ArtifactEdited',
  AgentStarted = 'AgentStarted',
  AgentPlanCreated = 'AgentPlanCreated',
  AgentCompleted = 'AgentCompleted',
  AgentFailed = 'AgentFailed'
}

export interface DomainEvent {
  type: DomainEventType
  aggregateId: string
  occurredAt: Date
  metadata?: Record<string, any>
}

export class ArtifactApprovedEvent implements DomainEvent {
  readonly type = DomainEventType.ArtifactApproved
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string, // artifactId
    public readonly initiativeId: string
  ) {}
}

export class ArtifactNeedsReviewEvent implements DomainEvent {
  readonly type = DomainEventType.ArtifactNeedsReview
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string, // artifactId
    public readonly initiativeId: string
  ) {}
}

export class ArtifactEditedEvent implements DomainEvent {
  readonly type = DomainEventType.ArtifactEdited
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string, // artifactId
    public readonly initiativeId: string
  ) {}
}

export class AgentStartedEvent implements DomainEvent {
  readonly type = DomainEventType.AgentStarted
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string, // workflowId
    public readonly goal: string,
    public readonly initiativeId: string
  ) {}
}

export class AgentPlanCreatedEvent implements DomainEvent {
  readonly type = DomainEventType.AgentPlanCreated
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string, // workflowId
    public readonly planId: string
  ) {}
}

export class AgentCompletedEvent implements DomainEvent {
  readonly type = DomainEventType.AgentCompleted
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string // workflowId
  ) {}
}

export class AgentFailedEvent implements DomainEvent {
  readonly type = DomainEventType.AgentFailed
  readonly occurredAt = new Date()

  constructor(
    public readonly aggregateId: string, // workflowId
    public readonly error: string
  ) {}
}
