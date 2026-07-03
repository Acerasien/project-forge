<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-03 -->
<!-- Last updated: 2026-07-03 -->
<!-- Status: ✅ Accepted -->

# ADR-013: Agent Orchestration Layer

**Status:** ✅ Accepted  
**Date:** 2026-07-03  
**Resolves:** Milestone 9 Architecture (Engineering Agent framework)

---

## Purpose

Define how AI agents execute long-running goals that require planning and sequential tool invocation, while avoiding a monolithic AI service that handles everything.

---

## Context

Prior to Milestone 9, AI capabilities were executed directly via `AIGenerationService`. For isolated tasks (like reviewing a single artifact or drafting text), this was sufficient. However, as Forge evolves into an engineering platform, it needs the ability to execute long-running, multi-step goals (e.g., "Build Milestone 10" or "Refactor the database schema").

If we built this into `AIGenerationService`, it would become a massive monolith responsible for LLM streaming, capability execution, progress tracking, and workflow orchestration.

---

## Decision

We introduce an **Agent Orchestration Layer** with distinct separation of concerns:

1. **`AIGenerationService` remains the low-level LLM abstraction.** It handles provider routing, prompts, streaming, and tool schemas. It does _not_ know about workflows or long-running goals.
2. **`EngineeringAgent` serves as the high-level orchestrator.** It takes a goal, builds the context (`ContextBuilder`), delegates planning to a strategy (`IPlanningStrategy`), and then passes the plan to an executor (`WorkflowExecutor`).
3. **`WorkflowExecutor` is an AI-agnostic state machine.** It takes an `ExecutionPlan` and runs it step-by-step through the `CapabilityRegistry` (abstracted by `ICapabilityExecutor`). It tracks runtime state via `ExecutionSession`.

By composing `AIGenerationService` rather than replacing it, we can reuse all existing LLM integrations. By separating `PlanningEngine` from `WorkflowExecutor`, we ensure that capability execution is deterministic and testable.

---

## Alternatives

| Alternative                      | Why Rejected                                                                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monolithic AI Service**        | Bloats the LLM service with workflow logic, making it impossible to swap out planners or run non-AI workflows. Rejected.                                                                                                         |
| **Direct tool execution by LLM** | Standard ReAct pattern where the LLM just calls tools in a loop. Hard to track progress in a UI, unpredictable, and difficult to persist/resume. Rejected in favor of explicit `ExecutionPlan` generation followed by execution. |

---

## Consequences

✅ Clean separation between AI generation and workflow state management.  
✅ Extensible via `IPlanningStrategy` and `ICapabilityExecutor`.  
✅ Allows the UI to render structured plans and track step-by-step progress easily.  
⚠️ Adds additional domain concepts (`ExecutionPlan`, `ExecutionSession`, `ExecutionContext`) which increases the learning curve for contributors.
