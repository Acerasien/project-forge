<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-03 -->
<!-- Last updated: 2026-07-03 -->
<!-- Status: ✅ Accepted -->

# ADR-016: Capability Execution Contracts and Domain-Enforced Approval Gates

**Status:** ✅ Accepted  
**Date:** 2026-07-03  
**Resolves:** Standardized capability execution boundaries and domain-enforced workflow integrity.

---

## Purpose

Define the architectural contract for capability execution and establish how workflow progression (approval gates) is enforced, guaranteeing deterministic orchestration for all future capability packs.

---

## Context

With multiple capability packs (Requirements Engineering, Architecture Engineering) implemented, the `EngineeringAgent` must interact with capabilities in a unified way. Without a standardized execution boundary, the orchestration layer would become brittle and tightly coupled to individual capabilities. Furthermore, relying purely on the UI layer to block out-of-order execution (e.g., generating component designs before the architecture is approved) undermines domain integrity.

---

## Decision

1. **Standardized Capability Execution Contract:**
   Every capability must return a standardized contract (`CapabilityResult<T>`). This structure acts as the singular execution boundary between the `ICapability` implementations and the `EngineeringAgent` orchestrator.
2. **Domain-Enforced Approval Gates:**
   Approval is enforced by the domain, not the UI. Capabilities must actively enforce workflow integrity (e.g., the `GenerateComponentDesignCapability` will reject execution if the parent `Architecture` package is not in the `Approved` state).

---

## Consequences

✅ **Deterministic Orchestration:** The orchestration layer (`EngineeringAgent`, `WorkflowExecutor`) can blindly consume `CapabilityResult<T>` and rely on a common execution boundary to persist artifacts, insert graph edges, and save findings without knowing capability internals.
✅ **Resilient Workflow Integrity:** Because approval is a domain concern, the workflow cannot be bypassed by UI bugs or alternate interfaces (e.g., API clients).
✅ **Scalability:** Future capability packs (Security, Testing, Operations) can adopt this interface and immediately plug into the existing execution model.
