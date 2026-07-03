<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-006: Directed Graph Model for Artifact Traceability

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Define how Forge represents and enforces relationships between artifacts — the core data structure behind the engineering graph.

---

## Context

The engineering graph is a core Forge differentiator. Artifacts must be linkable with typed, directed relationships (Task → Requirement, Architecture → ADR, AI Session → Artifact). The graph must support traversal queries ("show me everything derived from this Requirement"), cascade logic (editing an approved artifact flags downstream artifacts for review), and cycle prevention (a Task cannot be its own parent Requirement).

---

## Decision

ArtifactRelationships are stored as **explicit records** in an `artifact_relationships` table:

```
artifact_relationships(
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES artifacts(id),
  target_id   TEXT NOT NULL REFERENCES artifacts(id),
  type        TEXT NOT NULL,  -- RelationshipType enum
  created_at  TEXT NOT NULL
)
```

The graph is a **directed, typed, acyclic graph (DAG)**. Cycle prevention is enforced by the GraphService at the Domain layer before any edge is persisted. Traversal queries are handled using SQLite recursive CTEs.

**Supported relationship types (v1):**

| Type         | Semantic                                           |
| ------------ | -------------------------------------------------- |
| DerivedFrom  | Task was generated from this Requirement           |
| InformedBy   | Architecture or ADR was shaped by this Requirement |
| DecidedBy    | This Architecture element is governed by this ADR  |
| Implements   | System Design implements this Architecture element |
| Generated    | AI Session produced content for this Artifact      |
| SupersededBy | This ADR is replaced by another ADR                |

---

## Alternatives

| Alternative                                                                | Why Rejected                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Implicit relationships via foreign keys only (e.g., `task.requirement_id`) | Simple but not extensible. Cannot express multi-hop traceability or new relationship types without schema changes. |
| Dedicated graph database (e.g., Neo4j)                                     | Powerful but introduces a second technology and significant operational dependency for a local tool.               |
| In-memory graph rebuilt at startup                                         | Fast queries but loses relationships if not persisted. Requires perfect reconstruction logic.                      |

---

## Consequences

✅ New relationship types are additive (add to `RelationshipType` enum + handle in GraphService). Zero schema changes.  
✅ Graph traversal is expressible in SQL — no additional query language required.  
✅ Relationships are first-class records — they can carry their own metadata if needed in future.  
✅ The DAG invariant ensures the graph never has cycles, which prevents infinite traversal loops.  
⚠️ Recursive CTE queries must be carefully bounded. The DAG invariant must be enforced at write time — not assumed at read time.  
⚠️ Deleting an artifact requires cascading relationship cleanup. Orphaned relationships must be detected and removed.

---

## Future Considerations

- If graph visualization becomes a core feature, a more sophisticated graph layout algorithm may be needed in the UI layer — the underlying data model supports this without changes.
- If the `artifact_relationships` table grows very large (thousands of entries), profile recursive CTE performance and consider materialized path caches for common traversals.
- A future "impact analysis" feature ("if I change this Requirement, what else is affected?") is a direct application of this graph model — no schema changes required.
