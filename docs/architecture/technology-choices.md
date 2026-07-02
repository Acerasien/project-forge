<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Technology Choices

Technology decisions for Forge v1. Confirmed decisions are locked. Recommended decisions require explicit confirmation before implementation begins.

See [../decisions/README.md](../decisions/README.md) for the full ADR index with rationale for each decision.

---

## Confirmed Decisions

| Layer | Decision | ADR |
|-------|---------|-----|
| Delivery mechanism | Electron desktop application | [ADR-001](../decisions/ADR-001-electron-delivery.md) |
| Architecture pattern | Platform-agnostic — future web version possible | [ADR-001](../decisions/ADR-001-electron-delivery.md) |
| Layering strategy | Clean Architecture + Hexagonal (Ports & Adapters) | [ADR-002](../decisions/ADR-002-clean-architecture.md) |
| Storage abstraction | `StoragePort` interface — adapters are swappable | [ADR-003](../decisions/ADR-003-storage-port-abstraction.md) |
| AI abstraction | `AIPort` interface — provider-agnostic | [ADR-004](../decisions/ADR-004-ai-provider-abstraction.md) |
| Local persistence | SQLite via `better-sqlite3` + FTS5 | [ADR-005](../decisions/ADR-005-sqlite-persistence.md) |
| Artifact relationships | First-class `artifact_relationships` table (typed directed graph) | [ADR-006](../decisions/ADR-006-artifact-graph-model.md) |
| Electron IPC | `contextBridge` + `contextIsolation: true` — renderer sandboxed | [ADR-007](../decisions/ADR-007-electron-ipc-security.md) |
| Cloud sync | **Not in v1** — explicitly deferred | [ADR-003](../decisions/ADR-003-storage-port-abstraction.md) |

---

## Recommended — To Be Confirmed Before Implementation

| Layer | Recommended Choice | Why | Alternatives Considered |
|-------|-------------------|-----|------------------------|
| **Language** | TypeScript | Type safety essential for a long-lived solo project. Runs in both Electron (Node.js) and browser — supports future web version. | JavaScript (no type safety — risky for solo long-term), Rust (too steep for UI layer) |
| **UI Framework** | React | Natural pairing with Electron. Same code targets a future web app with no framework change. Large ecosystem, excellent TypeScript support. | Vue (viable, smaller ecosystem for desktop), Svelte (smaller community, fewer Electron integrations) |
| **State management** | Zustand | Minimal boilerplate, excellent TypeScript support, no provider wrapping. Appropriate for a single-user desktop app context. | Redux (too heavy for solo app), React Context (re-render cascade issues) |
| **AI provider abstraction** | Custom `AIPort` interface + adapter per provider | Keeps core free of any LLM SDK dependency. New providers = new adapter. Zero domain changes. | LangChain (heavy, significant version churn risk for solo project) |
| **API key storage** | `keytar` (cross-platform OS keychain) | Supports macOS Keychain, Windows Credential Manager, and libsecret on Linux. Keys never in plaintext. | `.env` files (plaintext, unacceptable), `electron-store` with encryption (weaker security model) |
| **Markdown export** | `remark` / `unified` ecosystem | Mature, composable, produces clean Markdown compatible with Obsidian, Notion, GitHub, VS Code. | Custom string templates (brittle), Pandoc (external binary dependency) |

---

## Future Technology Milestones

| Milestone | Technology Consideration |
|-----------|------------------------|
| Cloud sync (v2) | Evaluate CR-SQLite (CRDT-based) for conflict-free local sync. `StoragePort` makes the swap additive. |
| Team deployments (v2+) | PostgreSQL via a new `PostgreSQLStorageAdapter`. Schema compatibility with SQLite model required. |
| Additional AI providers | New `AIPort` adapter per provider. Zero domain or application changes. |
| Web version | Replace Electron Presentation layer + infrastructure adapters. Domain and Application layers are unchanged. |

---

*See [../decisions/README.md](../decisions/README.md) for full ADR index.*
