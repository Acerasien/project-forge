# Milestone 8: Event-Driven Workflow & Artifact Intelligence

This milestone focuses on answering the question: _"How does this make software engineers produce better engineering artifacts?"_

By transitioning the workflow engine to a Domain Event architecture, we decouple core services and lay the foundation for **Artifact Intelligence**—where the AI actively participates in the engineering methodology by reviewing, critiquing, and scoring artifacts.

## User Review Required

> [!IMPORTANT]
> **Database Schema Expansion**
> I am proposing adding a new table, `artifact_intelligence`, rather than bloating the `artifacts` table with intelligence metadata. This keeps core persistence clean while allowing the intelligence schema to evolve rapidly as we discover new AI capabilities.
> **Does this separation align with your vision for the domain model?**

> [!TIP]
> **Event Bus Implementation**
> I plan to implement a lightweight in-memory `DomainEventBus` using Node's native `EventEmitter`. This is simple, requires no external dependencies (like Redis/RabbitMQ), and fits perfectly within our local-first architecture.

## Proposed Changes

### 1. Domain Events Framework

We will decouple the `ArtifactEngine` and `WorkflowEngine` by introducing a local event bus.

#### [NEW] `src/domain/events/DomainEvent.ts`

- Base interface for all domain events.
- Specific events: `ArtifactApprovedEvent`, `ArtifactNeedsReviewEvent`, `ArtifactEditedEvent`.

#### [NEW] `src/infrastructure/events/LocalEventBus.ts`

- A singleton publisher/subscriber utilizing `EventEmitter` to dispatch and listen to domain events asynchronously.

#### [MODIFY] `src/application/services/ArtifactEngine.ts`

- Remove direct dependency on `WorkflowEngine`.
- Publish `ArtifactApprovedEvent` and `ArtifactEditedEvent` to the event bus.

#### [MODIFY] `src/application/services/WorkflowEngine.ts`

- Refactor to act as an event subscriber.
- Listen for `ArtifactApprovedEvent` and `ArtifactEditedEvent` to trigger cascade rules and state updates.

---

### 2. Artifact Intelligence

Introduce the capability for AI to formally review and critique engineering artifacts, evaluating them on completeness, coverage, and downstream impact.

#### [NEW] `src/infrastructure/database/migrations/006-artifact-intelligence.ts`

- Create `artifact_intelligence` table:
  - `artifact_id` (Foreign Key)
  - `completeness_score` (Integer 0-100)
  - `ai_confidence` (Integer 0-100)
  - `critique_summary` (TEXT)
  - `last_validated_at` (DATETIME)

#### [NEW] `src/domain/entities/ArtifactIntelligence.ts`

- Domain entity representing the AI's understanding and evaluation of an artifact.

#### [NEW] `src/application/services/ArtifactIntelligenceService.ts`

- Service that listens to `ArtifactNeedsReviewEvent` (or UI triggers) to analyze the artifact content.
- Generates intelligence metadata (scores, critiques, downstream impact) by interacting directly with the `AIGenerationService` or `OpenAIProvider`.

---

### 3. AI Capabilities & UI

#### [NEW] `src/application/capabilities/ArtifactCapabilities.ts`

- `ReviewArtifactCapability`: Allows the AI to proactively generate critique summaries and completeness scores.
- `QueryGraphCapability`: Allows the AI to read relationships (e.g. tracing from Requirements to Architecture) to validate alignment.

#### [MODIFY] `src/renderer/src/pages/Workspace.tsx`

- Expand the Artifact Dashboard to display **Completeness** and **AI Confidence** metrics next to each artifact.
- Add an "AI Review" action button allowing users to manually trigger an intelligent critique of a specific artifact.

## Verification Plan

### Automated Tests (Typecheck & Lint)

- Run `npm run typecheck` and `npm run lint` to verify event bus and new services compile correctly.

### Manual Verification

1. **Event Propagation:** Approve an artifact via the UI and verify that the `WorkflowEngine` correctly intercepts the event and updates the graph/initiative status without being directly invoked.
2. **Artifact Intelligence:** Trigger an AI Review on a draft Architecture document. Verify that the AI provides a `completeness_score`, a critique summary, and stores this data in the `artifact_intelligence` table.
3. **UI Integration:** Ensure the intelligence metadata (scores/critiques) correctly surfaces in the Artifact Dashboard without disrupting the standard document editing flow.
