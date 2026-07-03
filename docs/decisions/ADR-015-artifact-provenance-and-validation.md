<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-03 -->
<!-- Last updated: 2026-07-03 -->
<!-- Status: ✅ Accepted -->

# ADR-015: Artifact Provenance and Validation Philosophy

**Status:** ✅ Accepted  
**Date:** 2026-07-03  
**Resolves:** Tracking artifact freshness, origin, and separated validation results.

---

## Purpose

Establish the standard mechanism for tracking how an artifact came into existence (Provenance) and how to evaluate its structural correctness and consistency (Validation), ensuring strong separation of concerns.

---

## Context

As the platform scales to support numerous engineering disciplines (Requirements, Architecture, etc.), we need a way to track the historical origin of artifacts, enabling freshness analysis, rebuild planning, and stale-state detection. Additionally, we need to ensure that validating an artifact does not mutate the artifact's content itself, but rather produces structured feedback that can be assessed and resolved independently.

---

## Decision

1. **Artifact Provenance as a Domain Concern:** 
   Provenance is a first-class concern on the `Artifact` aggregate rather than opaque metadata or a separate table. We will strictly define origin fields (`generatedByCapabilityId`, `generatedByCapabilityVersion`, `generationSessionId`, `generatedWorkflowId`) directly on the model.
2. **Provenance is Immutable Historical Information:**
   Generating metadata records how an artifact came into existence. **It should never be rewritten simply because the artifact content changes.** New generations produce new provenance. They do not rewrite history.
3. **Structured Validation Philosophy:**
   Validation capabilities will not modify artifact content. Instead, they produce structured `Finding` objects that describe issues, recommendations, or observations.

---

## Consequences

✅ **Traceability:** Fully enables future features like stale-state detection and targeted artifact regeneration because the exact version of the capability that produced the artifact is known.
✅ **Immutability:** Treating provenance as immutable history ensures accurate auditing.
✅ **Clean Separation of Concerns:** Evaluation logic is isolated from generation logic. Findings are independent artifacts of the validation process.
