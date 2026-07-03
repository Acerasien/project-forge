<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-03 -->
<!-- Last updated: 2026-07-03 -->

# Capability Packs

Capability Packs are cohesive collections of `ICapability` implementations grouped by engineering discipline. They are the primary extension mechanism for the `EngineeringAgent`.

## Requirements Engineering Capability Pack

Introduced in Milestone 10, this pack teaches the agent how to analyze, generate, and validate project requirements.

| Capability | Purpose & Responsibility |
|------------|--------------------------|
| `GenerateRequirementsCapability` | Translates a Vision artifact into structured technical Requirements. |
| `GenerateUserStoriesCapability` | Translates Requirements into actionable agile stories with Acceptance Criteria. |
| `ProduceImplementationPlanCapability` | Consumes Requirements and Architecture to produce atomic execution steps. |
| `ReviewRequirementsCapability` | Performs rigorous assessment of requirements for ambiguity, conflicts, and completeness. |

## Workflow & Registration

Capabilities are stateless plugins. They are instantiated and registered into the `CapabilityRegistry` during application startup (`main/index.ts`). 

1. **Orchestration:** The `WorkflowExecutor` receives an `ExecutionPlan` containing tool calls.
2. **Execution:** It retrieves the corresponding capability from the `CapabilityRegistry` and calls `.execute()`.
3. **Persistence:** The capability loads required artifacts, delegates logic to `AIGenerationService` (or `IAIProvider` directly), and saves the result using `ArtifactEngine`.

## Primary vs. Derived Artifacts

With the introduction of capabilities, artifacts are categorized logically:

- **Primary Baseline:** `Vision`, `Requirements`, `Architecture`, `SystemDesign`. These form the linear approval cascade. They define the *what* and the *how*.
- **Derived Artifacts:** `UserStories`, `ImplementationPlan`. These are operational artifacts generated *from* the primary baseline. They exist alongside the main sequence and do not block downstream approval gates.

## The Engineering Graph

All Capability Packs are required to explicitly record their reasoning using the `GraphService`. 

When a capability creates an artifact, it must insert a typed edge representing the origin:

- `DerivedFrom`: Indicates direct generation (e.g., `UserStories` → `DerivedFrom` → `Requirements`).
- `InformedBy`: Indicates contextual influence (e.g., `ImplementationPlan` → `InformedBy` → `Architecture`).

These relationships form the backbone for future automation, such as impact analysis and stale-state invalidation.
