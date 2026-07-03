<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# System Design

How Forge runs and behaves at runtime — request lifecycle, data flow, failure recovery, scaling, and observability.

> **Relationship to Architecture:** [Architecture](../architecture/README.md) defines _what_ the system is. System Design defines _how it runs_.

| File                                               | Description                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [architecture-diagram.md](architecture-diagram.md) | Runtime component diagram — processes, adapters, and data stores                         |
| [data-flow.md](data-flow.md)                       | 4 critical workflow sequence diagrams (approval, AI generation, task derivation, search) |
| [agent-orchestration.md](agent-orchestration.md)   | The agent execution pipeline, state management, and capability extension points          |
| [capability-packs.md](capability-packs.md)         | The organization, integration, and rules for extending the agent with new capabilities   |
| [component-breakdown.md](component-breakdown.md)   | All 11 system design sections: API, storage, state, background processes, scalability    |
| [caching-strategy.md](caching-strategy.md)         | What is cached, where, for how long, and how it is invalidated                           |
| [error-handling.md](error-handling.md)             | Failure modes per component and graceful degradation behaviour                           |
| [observability.md](observability.md)               | Local logging strategy, log levels, key events, debugging workflow                       |
| [trade-offs.md](trade-offs.md)                     | Major design decisions — what was chosen, what was sacrificed                            |
| [risks.md](risks.md)                               | Known risks and open questions before implementation                                     |

---

## Design Priorities (in order)

1. **Reliability** — data is never lost or corrupted
2. **Maintainability** — one developer can understand this in 3 years
3. **Performance** — fast enough to feel instant (< 500ms for local ops)
4. **Operational simplicity** — no external services, no network dependency for core features

---

## Key Design Decisions

| Decision               | Chosen Approach                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| Internal communication | Electron IPC via typed `contextBridge` — renderer is fully sandboxed      |
| Local persistence      | SQLite (`better-sqlite3`, synchronous, WAL mode)                          |
| UI state               | Zustand stores — mirror of SQLite state, rebuilt on startup               |
| Domain event handling  | Inline function calls — no event bus in v1                                |
| AI requests            | Async Promise in main process — never blocks IPC event loop               |
| Error model            | `Result<T, ForgeError>` — all IPC responses, never throws across boundary |

See [trade-offs.md](trade-offs.md) for full rationale.
