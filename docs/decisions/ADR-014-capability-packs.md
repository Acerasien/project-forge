<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-03 -->
<!-- Last updated: 2026-07-03 -->
<!-- Status: ✅ Accepted -->

# ADR-014: Organizing Features into Capability Packs

**Status:** ✅ Accepted  
**Date:** 2026-07-03  
**Resolves:** Milestone 10 Feature Organization

---

## Purpose

Define the structure and organizational strategy for adding new capabilities to the EngineeringAgent, ensuring that Forge scales predictably without architectural bloat.

---

## Context

Following the introduction of the Agent Orchestration Layer (ADR-013), the EngineeringAgent became capable of running autonomous workflows. However, adding random, disconnected features to the agent would quickly lead to an unstructured, hard-to-maintain codebase.

We needed a strategy to group related capabilities, aligning them with natural software engineering disciplines (e.g., Requirements, Architecture, Validation) while leveraging the underlying orchestration platform.

---

## Decision

We will organize all future agent features into **Capability Packs**.

1. **Discipline-Based Grouping:** Each milestone will focus on a specific engineering discipline (e.g., Requirements Engineering, Code Intelligence).
2. **Encapsulation:** A Capability Pack is a cohesive set of `ICapability` implementations that reside in their own directory (e.g., `src/application/capabilities/requirements/`).
3. **Artifact-Centric Principle:** Every engineering capability must produce durable outputs (Artifacts or ArtifactIntelligence) whenever practical, rather than conversational text. "Artifacts are the source of truth. Chat is a presentation layer."
4. **Graph Integration:** Every generated artifact must explicitly record its origin using the `GraphService` (e.g., `DerivedFrom`, `InformedBy`) to build a traceable engineering graph.

---

## Consequences

✅ **Clear Roadmap:** Aligns agent growth with the software engineering lifecycle (Requirements → Architecture → Code → Validation).
✅ **Separation of Concerns:** Keeps the orchestration layer (EngineeringAgent, WorkflowExecutor) entirely decoupled from specific engineering logic.
✅ **Traceability:** Forces all capabilities to persist their work into the engineering graph, enabling future features like impact analysis and stale-state detection.
⚠️ **Higher Initial Effort:** Writing a capability is more complex than a standard LLM chat prompt because it requires formalizing the input/output models and graph relationships.
