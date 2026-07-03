<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-005: SQLite for Local Persistence

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Choose the local persistence mechanism for Forge v1 that supports the relational artifact graph, full-text search, and trivial backup — while remaining abstracted from the domain model for future storage migrations.

---

## Context

Forge needs to store structured, relational data (Initiatives, Artifacts, ADRs, Tasks, AI Sessions, ArtifactRelationships). The engineering graph requires queryable, typed relationships. Full-text search requires an index over artifact content. Backup must be trivial for a local-first tool. The data access layer must remain abstracted from the domain model to allow future storage implementations (cloud sync, PostgreSQL for team deployments) without requiring changes to core business logic.

---

## Decision

Use **SQLite via `better-sqlite3`** in the Electron main process. Use SQLite's built-in **FTS5 extension** for full-text search. A single `.sqlite` file in the Forge data directory serves as the local database.

**Key design decisions within this choice:**

- **Artifact relationships are first-class entities** — an explicit `artifact_relationships` table with typed directed edges (sourceId, targetId, relationshipType, createdAt). This supports Forge's long-term vision of an interconnected engineering knowledge graph and enables graph traversal via recursive CTEs without a separate graph database.
- **No domain or application code imports `better-sqlite3` directly.** All access goes through the `StoragePort` interface (see [ADR-003](ADR-003-storage-port-abstraction.md)).
- **The `LocalSQLiteAdapter`** wraps `better-sqlite3` and implements `StoragePort`. Future adapters implement the same interface.

---

## Alternatives

| Alternative                  | Why Rejected                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| JSON files per entity        | Simple but poor queryability, no transactions, no full-text search, difficult referential integrity. |
| PouchDB                      | Designed for offline-first + sync. More complex than needed for v1 (sync deferred).                  |
| LevelDB                      | Key-value store — relational queries require application-level join logic.                           |
| MongoDB (local via Electron) | Document model poor fit for a relational graph. Heavy for a local-only tool.                         |

---

## Consequences

✅ Single-file database is trivially portable and backupable (copy the `.sqlite` file).  
✅ Relational model handles artifact relationships naturally (foreign keys, join queries).  
✅ FTS5 provides full-text search with zero additional dependencies.  
✅ `better-sqlite3` is synchronous — no async complexity in the Electron main process.  
✅ Artifact relationships as first-class table rows support graph traversal via recursive CTEs, enabling the engineering knowledge graph without a separate graph database.  
⚠️ When cloud sync is added (v2), SQLite's single-writer model requires careful handling. The `CloudStorageAdapter` will need its own sync strategy (CRDTs or server-authoritative merge).  
⚠️ When team deployments are introduced, a migration path from SQLite to PostgreSQL must be planned. The `StoragePort` abstraction makes this a new adapter — no domain changes — but schema compatibility must be maintained.

---

## Future Considerations

- **Cloud sync (v2):** Evaluate CR-SQLite (CRDT-based) as the local storage strategy to enable conflict-free sync.
- **Team deployments (v2+):** PostgreSQL is the natural upgrade path for shared team storage. New `PostgreSQLStorageAdapter` — no domain changes.
- **Graph queries at scale:** If the `artifact_relationships` table grows large, profile recursive CTE performance and evaluate materialized traversal caches.
- **Interface async rule:** All `StoragePort` methods must be async (Promise-returning) from v1, even though `better-sqlite3` is synchronous internally. This prevents a breaking interface change when async cloud adapters are introduced.
