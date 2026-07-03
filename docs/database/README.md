<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Database

Complete database design for Forge v1 — schema, relationships, indexing, queries, and migration strategy.

> **Technology:** SQLite 3 via `better-sqlite3` · FTS5 · WAL mode  
> **Query builder:** Kysely (within `LocalSQLiteAdapter` only — not exposed to application layer)  
> **See:** [ADR-005](../decisions/ADR-005-sqlite-persistence.md) · [ADR-006](../decisions/ADR-006-artifact-graph-model.md) · [ADR-012](../decisions/ADR-012-kysely-query-builder.md)

---

| File                                         | Description                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| [schema.md](schema.md)                       | Complete DDL for all 8 tables, FTS5 virtual table, triggers, and SQLite configuration |
| [erd.md](erd.md)                             | Entity Relationship Diagram — table relationships and cardinalities                   |
| [indexing-strategy.md](indexing-strategy.md) | 12 query patterns mapped to 10 indexes with rationale                                 |
| [migration-plan.md](migration-plan.md)       | Startup migration strategy, safe change patterns, rollback procedure                  |
| [query-catalog.md](query-catalog.md)         | 8 critical SQL queries with N+1 analysis                                              |

---

## Design Decisions Summary

| Decision            | Choice                            | Rationale                                                               |
| ------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Database engine     | SQLite 3                          | Local-first, single-file, zero-server — perfect for a solo desktop tool |
| Concurrency model   | WAL mode                          | Enables concurrent readers (export worker) alongside the main writer    |
| Full-text search    | FTS5 + Porter stemming            | Zero additional dependency; "implement" matches "implementing"          |
| Primary keys        | UUID v4 TEXT                      | Future cloud sync requires globally unique IDs                          |
| Timestamps          | ISO 8601 TEXT in UTC              | SQLite has no native TIMESTAMP type                                     |
| ORM / query builder | Kysely                            | Type-safe SQL without hiding SQL semantics or owning the schema         |
| Graph edges         | `artifact_relationships` table    | First-class rows — typed, directed, no FKs (cross-table refs)           |
| Delete strategy     | Hard delete + domain-layer guards | Soft deletes add schema complexity without v1 benefit                   |
| Schema ownership    | Plain `.sql` migration files      | Portable to PostgreSQL; not coupled to any TypeScript ORM               |

---

## Table Overview

| Table                    | Rows (estimated v1 max) | Purpose                                                     |
| ------------------------ | ----------------------- | ----------------------------------------------------------- |
| `initiatives`            | ~50                     | Top-level workspaces                                        |
| `artifacts`              | ~10,000                 | Vision, Requirements, Architecture, System Design documents |
| `adrs`                   | ~500                    | Architecture Decision Records                               |
| `tasks`                  | ~25,000                 | Implementation tasks                                        |
| `ai_sessions`            | ~5,000                  | AI-assisted generation records                              |
| `artifact_relationships` | ~50,000                 | Engineering graph edges                                     |
| `settings`               | ~20                     | Workspace-scoped key-value config                           |
| `schema_migrations`      | ~10                     | Applied migration history                                   |
| `artifacts_fts`          | (virtual)               | Full-text search index (auto-maintained)                    |
