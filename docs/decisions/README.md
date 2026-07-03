<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Architecture Decision Records

All major engineering decisions for Forge are recorded here. ADR numbers are sequential and permanent — numbers are never reused.

---

## ADR Index

| ADR                                                         | Title                                                             | Status      | Date       |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ----------- | ---------- |
| [ADR-001](ADR-001-electron-delivery.md)                     | Electron as v1 Delivery Mechanism                                 | ✅ Accepted | 2026-07-02 |
| [ADR-002](ADR-002-clean-architecture.md)                    | Clean Architecture with Hexagonal Ports & Adapters                | ✅ Accepted | 2026-07-02 |
| [ADR-003](ADR-003-storage-port-abstraction.md)              | Storage Port Abstraction for Future Cloud Sync                    | ✅ Accepted | 2026-07-02 |
| [ADR-004](ADR-004-ai-provider-abstraction.md)               | Provider-Agnostic AI Interface                                    | ✅ Accepted | 2026-07-02 |
| [ADR-005](ADR-005-sqlite-persistence.md)                    | SQLite for Local Persistence                                      | ✅ Accepted | 2026-07-02 |
| [ADR-006](ADR-006-artifact-graph-model.md)                  | Directed Graph Model for Artifact Traceability                    | ✅ Accepted | 2026-07-02 |
| [ADR-007](ADR-007-electron-ipc-security.md)                 | Electron IPC Security — contextBridge, No nodeIntegration         | ✅ Accepted | 2026-07-02 |
| [ADR-008](ADR-008-codemirror-editor.md)                     | CodeMirror 6 as Artifact Editor Component                         | ✅ Accepted | 2026-07-02 |
| [ADR-009](ADR-009-react-flow-graph.md)                      | React Flow for Engineering Graph Visualisation                    | ✅ Accepted | 2026-07-02 |
| [ADR-010](ADR-010-configurable-workspace.md)                | User-Configurable Workspace Directory + Worker Thread Export      | ✅ Accepted | 2026-07-02 |
| [ADR-011](ADR-011-local-ai-providers.md)                    | Local AI Provider Support — Ollama + LM Studio                    | ✅ Accepted | 2026-07-02 |
| [ADR-012](ADR-012-kysely-query-builder.md)                  | Kysely as Query Builder within LocalSQLiteAdapter                 | ✅ Accepted | 2026-07-02 |
| [ADR-013](ADR-013-agent-orchestration-layer.md)             | Agent Orchestration Layer                                         | ✅ Accepted | 2026-07-03 |
| [ADR-014](ADR-014-capability-packs.md)                      | Organizing Features into Capability Packs                         | ✅ Accepted | 2026-07-03 |
| [ADR-015](ADR-015-artifact-provenance-and-validation.md)    | Artifact Provenance and Validation Philosophy                     | ✅ Accepted | 2026-07-03 |
| [ADR-016](ADR-016-capability-contracts-and-domain-gates.md) | Capability Execution Contracts and Domain-Enforced Approval Gates | ✅ Accepted | 2026-07-03 |

---

## ADR Status Icons

| Icon | Status     | Meaning                                   |
| ---- | ---------- | ----------------------------------------- |
| ✅   | Accepted   | Decision is active and should be followed |
| 🟡   | Proposed   | Under discussion — not yet accepted       |
| ⚠️   | Superseded | Replaced by a newer ADR (link provided)   |
| 🗄️   | Deprecated | No longer applicable; not replaced        |

---

## Guidelines

- **Never edit the Decision field of an Accepted ADR.** Create a new ADR instead and mark the original as Superseded.
- **ADR numbers never reuse.** Gaps in numbering are acceptable.
- **Every consequential decision gets an ADR** — decisions that are costly to reverse, affect multiple modules, or where reasonable people could disagree.
- **Minor decisions** get a one-line rationale inline in the relevant design document.
