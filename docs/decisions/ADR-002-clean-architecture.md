<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-002: Clean Architecture with Hexagonal Ports & Adapters

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Define the layering strategy that ensures Forge remains evolvable and testable over many years by a solo developer.

---

## Context

Forge has genuine domain complexity: approval gates, artifact state machines, graph invariants, ADR immutability rules, and dependency enforcement. A layered architecture is necessary to protect the domain from infrastructure concerns and to allow the storage layer, AI provider, and external APIs to be swapped without domain changes. The system is intended to last many years under solo maintenance.

---

## Decision

Forge is structured in **four layers**:

1. **Presentation** (Electron Renderer) — React UI, navigation, IPC bridge
2. **Application** (Electron Main Process) — use cases, application services, command handlers
3. **Domain** (pure logic — zero framework dependencies) — entities, domain services, domain events, business rules
4. **Infrastructure** (adapters) — storage, AI provider, GitHub API, OS keychain, filesystem

All infrastructure is accessed through **port interfaces** defined by the Application/Domain layer. No infrastructure SDK is imported in any layer above Infrastructure.

DDD tactical patterns (aggregates, domain events) are applied selectively — to the core modules where domain complexity warrants it (Artifact lifecycle, WorkflowEngine, GraphService). Simpler modules (Settings, Export, Search) use thin services without domain modeling overhead.

---

## Alternatives

| Alternative                                 | Why Rejected                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Flat architecture (everything in one layer) | Simple to start; becomes unmaintainable as business rules grow. Rejected.                                               |
| Full DDD across all modules uniformly       | Appropriate for core modules; overkill for Settings, Export, Search. DDD applied selectively per Methodology Fit-Check. |

---

## Consequences

✅ Domain and Application layers are fully testable without any infrastructure dependency (mock adapters).  
✅ Storage, AI provider, and GitHub integration are independently swappable.  
✅ Future web version requires only new Presentation and Infrastructure adapters — Domain and Application are unchanged.  
⚠️ More initial structure than a simple CRUD app. Discipline must be maintained as features are added.

---

## Future Considerations

As Forge grows, module boundaries within the Application layer may need to harden into separate bounded contexts with explicit inter-context communication contracts.
