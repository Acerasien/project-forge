<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Risks & Open Questions

Known risks and unresolved questions to address before or during implementation.

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **IPC channel inventory grows unmanaged** — no typed registry discipline leads to undocumented channels and contract drift | Medium | Medium | Enforce a typed `window.forge` interface definition from day one. All contextBridge methods generated from a shared contract. Never add ad-hoc channels. |
| R2 | **Large Initiative export blocks the main process** — exporting 200+ artifacts synchronously can freeze the UI | Medium | High | Route export operations through `worker_threads`. Or: show a modal that blocks UI while the synchronous export runs (simpler, acceptable for infrequent operations). **Must decide before implementing ExportService.** |
| R3 | **Very large AI responses strain IPC** — completions of 50,000+ tokens passed as a single IPC message | Low | Medium | Apply a configurable max-token limit on AI generation requests. If streaming is needed in future, use IPC event-based streaming (`ipcRenderer.on`) rather than a single large response. |
| R4 | **SQLite WAL file grows large without checkpoint** — WAL accumulates if checkpointing doesn't run | Low | Medium | `PRAGMA wal_autocheckpoint = 1000` (checkpoint every 1000 pages). Run `PRAGMA wal_checkpoint(TRUNCATE)` on application shutdown and before backup export. |
| R5 | **Artifact editor component not selected** — the text editor for artifact content (particularly long System Design documents) requires a capable component | Medium | Medium | **Must resolve before Phase 8 (Frontend Design).** Candidates: CodeMirror 6, Monaco Editor. Evaluation criteria: Markdown support, TypeScript-first, performance with large documents, Electron compatibility. |
| R6 | **Graph visualisation library not selected** — the engineering graph view (US-9.1) requires a graph rendering library | Medium | Medium | **Must resolve before Phase 8 (Frontend Design).** Candidates: `reactflow`, `elkjs` + SVG, `d3-force`. Evaluation criteria: React-native, handles 50–200 nodes, readable edge labels, good defaults. |
| R7 | **First-run experience not designed** — database creation path, data directory location, initial onboarding UX | Medium | Medium | **Must resolve in Phase 8 (Frontend Design).** Key decisions: Is the SQLite path configurable? Is there a guided "Create your first Initiative" onboarding? Is there an import path for existing data? |

---

## Open Questions — Resolved

All questions resolved. Decisions recorded in ADR-008 through ADR-011.

| # | Question | Decision | ADR |
|---|---------|----------|-----|
| Q1 | Editor component | **CodeMirror 6** | [ADR-008](../decisions/ADR-008-codemirror-editor.md) |
| Q2 | Graph visualisation library | **React Flow** | [ADR-009](../decisions/ADR-009-react-flow-graph.md) |
| Q3 | Data directory strategy | **User-configurable workspace, default `~/Forge`** | [ADR-010](../decisions/ADR-010-configurable-workspace.md) |
| Q4 | Export threading strategy | **`worker_threads` with progress UI** | [ADR-010](../decisions/ADR-010-configurable-workspace.md) |
| Q5 | AI token limits | **Provider defaults + advanced user override** | [ADR-011](../decisions/ADR-011-local-ai-providers.md) |
| Q6 | AI provider onboarding | **Provider-agnostic: OpenAI, Anthropic, Gemini, Ollama, LM Studio, Skip** | [ADR-011](../decisions/ADR-011-local-ai-providers.md) |
| Q7 | Graph node scope | **Everything is a node: Artifacts, ADRs, Tasks, AI Sessions** | [ADR-009](../decisions/ADR-009-react-flow-graph.md) |

---

## Pre-Implementation Checklist

- [x] **R5/Q1:** Editor component selected → **CodeMirror 6**
- [x] **R6/Q2:** Graph visualisation library selected → **React Flow**
- [x] **R7/Q3:** Data directory strategy decided → **User-configurable, default `~/Forge`**
- [x] **R2/Q4:** Export strategy decided → **`worker_threads` + progress UI**
- [x] **Q6:** AI onboarding strategy decided → **Provider-agnostic (6 providers + Skip)**

✅ All pre-implementation blockers resolved. Ready for Phase 8 (Frontend Design).
