<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-003: Storage Port Abstraction for Future Cloud Sync

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Enable cloud sync, PostgreSQL team deployments, and other storage strategies to be added in future versions without touching core domain or application logic.

---

## Context

v1 is fully local-first. Cloud sync is explicitly deferred. However, the architecture must not make cloud sync prohibitively expensive to add later. Without an abstraction, every future storage change requires modifying application services — a violation of the Open/Closed Principle and a significant maintenance risk for a solo developer.

---

## Decision

All persistence operations go through a **`StoragePort` interface** defined in the Application layer. v1 implements this with `LocalSQLiteAdapter`. Future versions can introduce adapters without any changes to the Application or Domain layers:

- v2: `CloudStorageAdapter` or `HybridStorageAdapter` (local + cloud sync)
- v2+: `PostgreSQLStorageAdapter` (team deployments)

No domain or application code imports a database driver directly.

---

## Alternatives

| Alternative                                 | Why Rejected                                                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct SQLite calls in application services | Creates hard dependency on SQLite. Every storage change requires modifying application code. Rejected.                                                         |
| Design cloud sync now and build it locally  | Premature complexity. Sync conflict resolution (CRDTs, operational transforms) is a multi-month engineering problem. Explicitly deferred per product decision. |

---

## Consequences

✅ Cloud sync can be introduced in v2 as a new adapter with zero domain changes.  
✅ Testing is simplified — tests use an in-memory `StoragePort` implementation.  
✅ PostgreSQL for team deployments is a new adapter, not a migration.  
⚠️ The `StoragePort` interface must be designed to accommodate both local (synchronous, fully consistent) and cloud (asynchronous, eventually consistent) semantics. Design with async-first signatures from v1 even though the local adapter is synchronous.

---

## Future Considerations

- **Cloud sync (v2):** Evaluate CR-SQLite (CRDT-based) for conflict-free sync. The `StoragePort` abstraction makes this a new `LocalCRSQLiteAdapter`.
- **Team deployments (v2+):** `PostgreSQLStorageAdapter` — schema compatibility with the SQLite model required.
- **Interface design rule:** All `StoragePort` methods should be async (Promise-returning) from v1, even though the `LocalSQLiteAdapter` uses synchronous `better-sqlite3` internally. This prevents a breaking interface change when cloud adapters are introduced.
