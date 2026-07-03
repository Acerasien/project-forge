# Milestone 9: Engineering Agent & Planning Engine

## Objective
Evolve Forge from an AI-powered editor into an AI-native engineering platform. Introduce an orchestration layer that converts user goals into multi-step execution plans, utilizing the platform's capabilities (documents, artifacts, graph, validation) to perform complex engineering workflows.

## Architectural Changes

### 1. Agent Abstraction (`IAgent`)
Introduce a generic abstraction for autonomous agents to allow different specialized agents (Engineering, Reviewer, Planner) to coexist in the future.
```typescript
export interface AgentEvent {
  workflowId: string;
  type: 'plan_created' | 'step_started' | 'step_completed' | 'step_skipped' | 'step_failed' | 'paused' | 'resumed' | 'completed' | 'cancelled' | 'error';
  data: any;
}

export interface IAgent {
  execute(goal: string, initiativeId: string): AsyncIterable<AgentEvent>;
}
```

### 2. Context Builder (`ContextBuilder` & Providers)
Responsible for assembling the optimal context before model invocation. It will compose multiple context providers (implementing `IContextProvider`) to remain extensible:
- `ArtifactContextProvider`
- `GraphContextProvider`
- `ValidationContextProvider`
- `WorkspaceContextProvider`

### 3. Planning Engine (`PlanningEngine`)
Translates a high-level user goal into a discrete execution plan.
- Does NOT depend directly on `AIGenerationService`. Instead, it uses an injected `IPlanningStrategy` to generate the plan.
- Returns an immutable, strongly typed `ExecutionPlan` domain model (with `ExecutionStep` dependencies).

### 4. Workflow Executor (`WorkflowExecutor`)
Executes an `ExecutionPlan`. Separates planning from execution.
- Creates an `ExecutionSession` (or `WorkflowInstance`) to track runtime state (Started, Completed, Retry Count).
- Uses an `ExecutionContext` passed between steps to share variables and outputs.
- Executes steps via an injected `ICapabilityExecutor` abstraction (rather than directly calling `CapabilityRegistry`).

### 5. Engineering Agent (`EngineeringAgent`)
The primary orchestrator. Kept intentionally thin. Implements `IAgent`.
1. Generates a unique `workflowId`.
2. Calls `ContextBuilder` for state.
3. Calls `PlanningEngine` to generate an immutable `ExecutionPlan`.
4. Passes the plan and initial `ExecutionContext` to `WorkflowExecutor`.
5. Emits `AgentEvent`s (tagged with `workflowId`) continuously.

### 5. Domain Events
Emit events for significant agent actions to allow observability, auditing, and future automation to subscribe without coupling to the agent.
- `AgentStartedEvent`
- `AgentPlanCreatedEvent`
- `AgentStepStartedEvent`
- `AgentStepCompletedEvent`
- `AgentStepFailedEvent`
- `AgentCompletedEvent`

## Implementation Steps

1. **Core Abstractions:**
   - Define `IAgent`, `AgentEvent`, and context types in `src/domain/ai/`.
   - Define new domain events in `src/domain/events/DomainEvent.ts`.

2. **Context Builder:**
   - Implement `ContextBuilder` in `src/application/services/agents/ContextBuilder.ts`.
   - Wire it up with existing repositories (Artifact, Document, Graph, Intelligence).

3. **Planning Engine:**
   - Implement `PlanningEngine` in `src/application/services/agents/PlanningEngine.ts`.
   - Use `IAIProvider` to generate structured JSON plans based on context and goal.

4. **Engineering Agent:**
   - Implement `EngineeringAgent` in `src/application/services/agents/EngineeringAgent.ts`.
   - Integrate with `ContextBuilder`, `PlanningEngine`, and `CapabilityRegistry`.
   - Ensure `CapabilityRegistry` remains completely stateless.

5. **Integration & UI:**
   - Refactor or augment `AIGenerationService` (or introduce an `AgentService`) to expose the `EngineeringAgent` via IPC.
   - Update the Workspace UI to handle agent events (e.g., displaying the plan, showing progress on steps) instead of just rendering raw text/tool streams.
