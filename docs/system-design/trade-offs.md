<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Trade-offs

Major design decisions made during System Design — what was chosen, what was sacrificed, and why.

---

## Trade-off Summary

| # | Decision | Chosen | Alternative | Why Chosen | What Is Sacrificed |
|---|---------|--------|-------------|-----------|-------------------|
| T1 | SQLite concurrency model | Synchronous `better-sqlite3` in main process | `node-sqlite3` or Drizzle (async) | Eliminates async complexity for all DB ops. Local SQLite writes are <1ms — sync is imperceptible. | Main process blocks during writes. For v1 volumes (<1ms/write), negligible. Large exports may need `worker_threads`. |
| T2 | Domain event handling | Inline function calls — no event bus | EventEmitter / MicroBus | Simpler, synchronous, debuggable for a solo developer. All handlers are visible in one place. | Adding a second consumer to an event requires modifying the triggering service. Extracting to an event bus later is non-trivial. |
| T3 | UI update strategy | Wait for main-process confirmation | Optimistic updates + rollback | SQLite round-trips feel instant locally. Zero rollback complexity. | Slight perceived latency on writes. AI generation (30s) shows a loading state — optimistic update not possible anyway. |
| T4 | UI state management | Zustand | Redux Toolkit | Minimal boilerplate, excellent TypeScript support, no provider wrapping. Appropriate for a single-user desktop context. | Redux DevTools ecosystem and time-travel debugging. Redux's strict unidirectionality is valuable at team scale — not needed here. |
| T5 | Search engine | SQLite FTS5 (built-in) | MeiliSearch / Lunr.js | Zero additional dependency. Co-located with main database. Fast at Forge data volumes. | Advanced features (fuzzy matching, faceted search, custom relevance tuning). FTS5's BM25 ranking is sufficient for v1. |
| T6 | Auto-save debounce | 500ms | Immediate save / manual save button | Balances responsiveness with write frequency. Avoids per-keystroke SQLite writes. | User can lose up to 500ms of typing on crash. Mitigation: WAL mode makes committed writes crash-safe — only the debounce window is at risk. |

---

## Extended Rationale

### T1 — Synchronous SQLite

This is the most consequential decision in the data layer. `better-sqlite3` runs synchronously in the main process. Every write call blocks the thread until completion.

**Why this is acceptable:** Local SQLite writes on modern hardware complete in < 1ms for typical Forge operations (single-row updates, inserts). The perceived latency from the user's perspective is zero. The alternative — async SQLite — would require every data access to be wrapped in `async/await`, adding noise and complexity throughout the application service layer.

**The boundary condition:** Large operations (full-Initiative export with 200+ artifacts) could block the main process for measurable time. This must be handled with `worker_threads` for the export path specifically (see Risk R2).

---

### T2 — No Event Bus

An event bus (Node.js `EventEmitter`, MicroBus, or a custom pub/sub) would provide decoupling between domain event producers and consumers. For example, `ArtifactApproved` could notify multiple independent consumers (WorkflowEngine, GraphService, InitiativeManager) without the producer knowing about each one.

**Why deferred:** In v1, there is exactly one event producer and a small number of well-known consumers for each event type. The coupling is explicit and visible. Introducing an event bus for 4–5 event types in a solo codebase is premature abstraction that adds indirection without benefit.

**The extraction path:** When a second independent consumer needs to react to the same event, extract to an EventEmitter-based bus. The handlers are already isolated methods — the refactor is mechanical.

---

### T3 — No Optimistic Updates

Optimistic updates apply a state change to the UI immediately, before the server (or in this case, main process) confirms it. If the operation fails, the UI rolls back.

**Why not used:** SQLite local writes are fast enough that the UI round-trip (UI → IPC → SQLite → IPC → UI) takes < 50ms. Users will not perceive this latency. The rollback logic required for optimistic updates (track previous state, handle failure cases, merge with subsequent changes) adds significant complexity for zero user-facing benefit in this context.

---

### T5 — FTS5 over MeiliSearch

MeiliSearch is a production-grade search engine with excellent developer experience, typo tolerance, and relevance tuning. It runs as a separate process.

**Why FTS5 instead:** Running a separate MeiliSearch process for a local desktop tool is operationally complex — Forge would need to spawn, health-check, and manage a background server process. SQLite FTS5 is co-located with the database, has zero startup cost, and handles Forge's data volumes (< 10,000 documents) with excellent performance. The lack of fuzzy matching is the main trade-off; this can be revisited in v2 if user feedback indicates search quality is insufficient.
