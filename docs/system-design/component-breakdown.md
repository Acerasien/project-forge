<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Component Breakdown

Covers: API Communication, Database & Storage, State Management, Background Processes, and Scalability.

See [data-flow.md](data-flow.md) for request lifecycle sequence diagrams.  
See [../architecture/component-list.md](../architecture/component-list.md) for component responsibilities.

---

## 3. API Communication

### Internal: Electron IPC

All communication between the renderer and main process uses Electron's typed IPC system.

| Pattern              | Use Case                              | Mechanism                                                   |
| -------------------- | ------------------------------------- | ----------------------------------------------------------- |
| **Request/Response** | All CRUD, queries, approvals, exports | `ipcMain.handle()` + `ipcRenderer.invoke()` — async Promise |
| **Streaming events** | AI generation progress (future v1.1)  | `ipcMain.emit()` + `ipcRenderer.on()` — event-based         |

**IPC channel naming convention:** `{domain}:{action}` — e.g., `artifact:approve`, `ai:generate`, `search:query`

**`window.forge` API surface (contextBridge):**

```typescript
window.forge = {
  initiatives: { create, list, get, update, archive, delete },
  artifacts:   { get, update, approve, approveOverride, applyDraft },
  adrs:        { create, list, accept, deprecate, supersede, link },
  tasks:       { create, list, update, generateFromRequirements, pushToGitHub },
  ai:          { generate, review, discardDraft },
  search:      { query },
  export:      { artifact, initiative, backup, restore },
  settings:    { get, update, testAIConnection },
  graph:       { getRelationships, getArtifactGraph }
}
```

All methods return `Promise<Result<T, ForgeError>>` — errors are structured values, never thrown across IPC.

```typescript
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E }

type ForgeError = {
  code: ForgeErrorCode // VALIDATION_ERROR | DB_ERROR | AI_ERROR | GATE_WARNING | ...
  message: string // Human-readable, shown in UI toast or modal
  details?: unknown // Debug info — not displayed in UI by default
}
```

### External: HTTPS APIs

| API                | Component            | Auth                     | Pattern                             |
| ------------------ | -------------------- | ------------------------ | ----------------------------------- |
| AI LLM Provider    | `LLMProviderAdapter` | API key from OS Keychain | Request/Response (async, up to 30s) |
| GitHub REST API v3 | `GitHubAPIAdapter`   | PAT from OS Keychain     | Request/Response (push only)        |

**Rule:** No external network calls from the renderer. All outbound traffic originates from the main process.

---

## 4. Database & Storage

### SQLite Configuration (applied on every database open)

```sql
PRAGMA journal_mode = WAL;       -- Write-Ahead Logging: better crash safety + read concurrency
PRAGMA foreign_keys = ON;        -- Enforce referential integrity
PRAGMA synchronous = NORMAL;     -- Safe with WAL mode; faster than FULL
PRAGMA cache_size = -64000;      -- 64MB in-memory page cache
PRAGMA temp_store = MEMORY;      -- Temp tables in memory
PRAGMA wal_autocheckpoint = 1000;-- Checkpoint WAL every 1000 pages
```

### Schema (Table Summary)

| Table                    | Purpose                                  | Key Constraints                                              |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `initiatives`            | Initiative metadata and status           | PK: id (UUID)                                                |
| `artifacts`              | All artifact content and lifecycle state | FK: initiative_id; type enum; status enum                    |
| `adrs`                   | Architecture Decision Records            | UNIQUE(initiative_id, seq_number) — numbers never reused     |
| `tasks`                  | Implementation tasks                     | FK: requirement_id NOT NULL — no orphan tasks                |
| `ai_sessions`            | Read-only AI interaction records         | FK: artifact_id; status: pending-review\|accepted\|discarded |
| `artifact_relationships` | Engineering graph edges                  | UNIQUE(source_id, target_id, type) — no duplicate edges      |
| `artifacts_fts`          | FTS5 virtual table for full-text search  | Auto-maintained via INSERT/UPDATE/DELETE triggers            |
| `schema_migrations`      | Applied migration history                | Sequential version numbers — never modified                  |

> Full DDL with all columns, indexes, and FTS triggers is maintained in the [database schema document](../database/schema.md) (created in Phase 7).

### Read/Write Patterns

| Operation                                    | Frequency  | Notes                                                 |
| -------------------------------------------- | ---------- | ----------------------------------------------------- |
| Load Initiative view                         | Frequent   | JOIN across artifacts, ADRs, tasks for one initiative |
| Auto-save artifact content                   | Frequent   | 500ms debounced UPDATE + FTS5 trigger                 |
| Artifact status change (approve/NeedsReview) | Moderate   | UPDATE + downstream recursive CTE                     |
| Graph traversal (recursive CTE)              | Moderate   | Bounded by DAG invariant — no infinite loops          |
| Full-text search (FTS5 MATCH)                | Frequent   | < 200ms at target data volumes                        |
| Create AI Session                            | Moderate   | INSERT + relationship INSERT                          |
| Export full Initiative                       | Infrequent | Full SELECT across all tables for one initiative      |

---

## 5. State Management

### State Architecture

```
[SQLite Database]          ← Authoritative source of truth (persistent, ACID)
       ↑ populated on startup + updated on every write
[Zustand Stores]           ← UI cache (ephemeral — rebuilt from SQLite on cold start)
       ↑ drives renders
[React UI Components]      ← Derived view (stateless where possible)
```

### Zustand Store Design

```typescript
initiativeStore:  { initiatives: Initiative[], activeInitiative: Initiative | null }
artifactStore:    { artifacts: Artifact[], activeArtifact: Artifact | null, isDirty: boolean }
graphStore:       { relationships: Relationship[], graphVisible: boolean }
searchStore:      { results: SearchResult[], query: string, isSearching: boolean }
aiStore:          { draft: string | null, sessionId: string | null, isGenerating: boolean }
settingsStore:    { aiProvider: AIProvider | null, isConfigured: boolean }
uiStore:          { activeView: View, modals: Modal[], notifications: Notification[] }
```

**Sync pattern (IPC → Zustand):**

1. User action → `window.forge.*` IPC call
2. Main process completes operation → returns updated entity
3. `onSuccess` handler in UI updates the relevant Zustand store
4. React re-renders from the updated store

**No bidirectional sync in v1.** State flows one way: `SQLite → IPC response → Zustand`. The renderer never reads SQLite directly.

### What is Stateful vs. Stateless

| Component            | Stateful?                  | Notes                                   |
| -------------------- | -------------------------- | --------------------------------------- |
| SQLite database      | ✅ Persistent state        | Single source of truth                  |
| Zustand stores       | ✅ Ephemeral state         | Rebuilt from SQLite on every cold start |
| Application services | ❌ Stateless               | Pure function calls over SQLite         |
| Domain entities      | ❌ Stateless between calls | Loaded, operated on, persisted          |
| AI provider          | ❌ Stateless               | Each request is independent             |
| GitHub adapter       | ❌ Stateless               | Each push is independent                |

---

## 6. Background Processes & Event Flows

### No External Workers or Queues in v1

| Process Type       | Decision                                 | Reason                                                         |
| ------------------ | ---------------------------------------- | -------------------------------------------------------------- |
| Job queue          | None                                     | Single user — no concurrent write contention requiring queuing |
| Background workers | None (except large export — see Risk R2) | All operations are fast enough for inline handling             |
| Scheduled tasks    | None                                     | No periodic processes needed in v1                             |
| WebSockets / SSE   | None                                     | No real-time multi-user requirements                           |

### Auto-Save (Debounced Write)

```
User types → onChange → isDirty = true
  → 500ms debounce resets on each keystroke
  → After 500ms silence:
      IPC: artifact:update(id, content)
      → SQLite UPDATE → FTS5 trigger
      → Response: { ok: true, updatedAt }
      → isDirty = false, "Saved ✓" shown
```

### Domain Event Handling (Inline)

Domain events are handled as direct function calls within the application service — no event bus in v1.

```
ArtifactEngine.approve(id)
  → [Domain logic: ArtifactApproved]
  → WorkflowEngine.onArtifactApproved(artifact)
      → GraphService.getDownstreamApproved(id)
      → For each downstream: ArtifactEngine.setNeedsReview()
      → InitiativeManager.recalculateStatus(initiativeId)
  → return { success, updatedArtifact, affectedArtifacts }
```

### AI Request Async Lifecycle

```
AIOrchestrator.generate(artifactId)
  → Load context (synchronous SQLite read)
  → Build prompt (synchronous)
  → AIPort.generate(prompt)   ← async Promise
      → LLMProviderAdapter → HTTPS → AI provider
      → Node.js event loop handles other IPC calls while awaiting
      → Response arrives (up to 30s)
  → Persist AISession (synchronous SQLite write)
  → Return { draft, sessionId }
```

---

## 9. Scalability Approach

> Traditional horizontal scaling does not apply to a local single-user desktop application. Scalability here means: **the app stays fast as user data grows over years.**

### Data Volume Scalability

| Concern                               | Approach                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| Long artifact content (50,000+ words) | CodeMirror editor — viewport-only rendering, never serialises entire content to DOM    |
| Many artifacts per Initiative (200+)  | Virtualized list rendering (`react-virtual` or equivalent) — renders only visible rows |
| Large FTS5 search index               | SQLite FTS5 handles millions of tokens efficiently — no concern at Forge data volumes  |
| Deep artifact relationship graph      | Recursive CTEs bounded by DAG invariant; indexed `source_id` / `target_id`             |

### Future Team Collaboration

When multi-user support is introduced (v2+):

- `StoragePort` abstraction → swap `LocalSQLiteAdapter` for `PostgreSQLStorageAdapter`
- All tables include `initiative_id` — multi-tenancy structurally supported
- Schema migrations add `sync_status`, `server_id`, `last_synced_at` columns to synced entities

### Bottleneck Analysis

| Bottleneck                               | Likelihood | Mitigation                                                |
| ---------------------------------------- | ---------- | --------------------------------------------------------- |
| AI response latency (30s p95)            | Certain    | Progress indicator; non-blocking async; user can cancel   |
| Large artifact editor (10,000+ words)    | Medium     | CodeMirror with viewport rendering                        |
| Large Initiative export (200+ artifacts) | Medium     | `worker_threads` for export; blocking progress modal      |
| Graph visualisation (100+ nodes)         | Low for v1 | Simple list view as fallback; defer advanced layout to v2 |
| SQLite write contention                  | None       | Single user, single writer — not applicable               |
