<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Error Handling & Failure Recovery

Per-component failure modes, graceful degradation strategy, and the structured error model.

See [../architecture/security-model.md](../architecture/security-model.md) for security-related failure modes.

---

## Structured Error Model

All IPC responses use a `Result<T, ForgeError>` discriminated union — errors are structured values, never unhandled exceptions across the IPC boundary.

```typescript
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E }

type ForgeError = {
  code: ForgeErrorCode // Machine-readable — drives UI logic
  message: string // Human-readable — shown in UI toast / modal
  details?: unknown // Debug context — not shown in UI by default
}

enum ForgeErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR', // Invalid input
  DB_ERROR = 'DB_ERROR', // SQLite failure
  AI_NOT_CONFIGURED = 'AI_NOT_CONFIGURED', // No AI provider set up
  AI_UNAVAILABLE = 'AI_UNAVAILABLE', // Provider API down
  AI_RATE_LIMITED = 'AI_RATE_LIMITED', // HTTP 429
  AI_INVALID_KEY = 'AI_INVALID_KEY', // HTTP 401
  INTEGRATION_ERROR = 'INTEGRATION_ERROR', // GitHub API failure
  INTEGRATION_AUTH = 'INTEGRATION_AUTH', // GitHub auth failure
  GATE_WARNING = 'GATE_WARNING', // Not an error — approval gate
  INVARIANT_VIOLATION = 'INVARIANT_VIOLATION', // Domain rule broken
  NOT_FOUND = 'NOT_FOUND' // Entity does not exist
}
```

---

## Failure Modes per Component

### Core Data Layer

| Failure                             | Code       | User Impact        | Recovery Strategy                                                  |
| ----------------------------------- | ---------- | ------------------ | ------------------------------------------------------------------ |
| SQLite write failure (disk full)    | `DB_ERROR` | Operation fails    | Persistent error banner. Prompt user to free disk space. No retry. |
| SQLite write failure (permissions)  | `DB_ERROR` | Operation fails    | Error banner with path. No retry — requires user action.           |
| SQLite database corruption (rare)   | `DB_ERROR` | App unusable       | Prompt user to restore from backup. Explain backup path.           |
| Schema migration failure on startup | `DB_ERROR` | App fails to start | Log error + show startup error screen with path to log file.       |

### Workflow Engine

| Failure                                        | Code                  | User Impact                        | Recovery Strategy                                            |
| ---------------------------------------------- | --------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Approval gate not passed                       | `GATE_WARNING`        | Not an error — confirmation dialog | User confirms override or cancels. Decision is logged.       |
| Domain invariant violation (e.g., orphan task) | `INVARIANT_VIOLATION` | Operation rejected                 | Inline validation error. State not persisted.                |
| Duplicate ADR sequence number                  | `INVARIANT_VIOLATION` | ADR creation fails                 | Error: "ADR numbers cannot be reused. Next available: [N+1]" |

### AI Orchestrator

| Failure                       | Code                | User Impact             | Recovery Strategy                                                                                           |
| ----------------------------- | ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| AI provider not configured    | `AI_NOT_CONFIGURED` | AI features unavailable | Toast: "Configure an AI provider in Settings" with deep-link button. All non-AI features remain functional. |
| AI provider API down          | `AI_UNAVAILABLE`    | Generation fails        | Toast: "AI unavailable — try again later." No auto-retry. User-initiated retry.                             |
| AI provider rate limited      | `AI_RATE_LIMITED`   | Generation fails        | Toast: "Rate limit hit. Retry in [N] seconds." `retryAfter` value shown.                                    |
| Invalid API key               | `AI_INVALID_KEY`    | Generation fails        | Toast: "Invalid API key. Check Settings > AI Configuration." Deep-link button.                              |
| AI response too large for IPC | Internal truncation | Draft may be incomplete | Truncate at max token limit (configurable). Notify user.                                                    |

### Integration Hub (GitHub)

| Failure                       | Code                | User Impact     | Recovery Strategy                                                             |
| ----------------------------- | ------------------- | --------------- | ----------------------------------------------------------------------------- |
| GitHub API unavailable        | `INTEGRATION_ERROR` | Task push fails | Toast: "GitHub unavailable — task unchanged in Forge." No auto-retry.         |
| GitHub authentication failure | `INTEGRATION_AUTH`  | Task push fails | Toast: "GitHub auth failed. Check Settings > Integrations." Deep-link button. |
| GitHub rate limited           | `INTEGRATION_ERROR` | Task push fails | Toast with rate limit reset time if available in response headers.            |

---

## Graceful Degradation

```
AI features unavailable (no key, provider down)
  → All artifact authoring, approvals, workflow, and graph features remain fully functional
  → AI-assisted buttons are disabled with explanatory tooltip
  → Core value proposition is fully available without AI

GitHub integration unavailable
  → All Forge features remain fully functional
  → Tasks can still be created, managed, and tracked in Forge
  → GitHub push is retryable when connectivity is restored

Search index issue (FTS5 error)
  → Fall back to SQLite LIKE queries (slower, no ranking)
  → Log WARN. Notify user of degraded search performance.
```

---

## React Error Boundaries

UI components are wrapped in React error boundaries at three levels:

| Boundary Level          | Scope                             | Behaviour on Error                                                                                                   |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Initiative view**     | Wraps entire Initiative workspace | Shows "This view encountered an error" with reload button. Prevents one corrupt artifact crashing the whole session. |
| **AI draft panel**      | Wraps the AI generation preview   | Shows "Draft preview unavailable" with dismiss button. Artifact editor unaffected.                                   |
| **Graph visualisation** | Wraps the engineering graph view  | Shows "Graph view unavailable" with fallback to list view. All other navigation unaffected.                          |

---

## Electron Crash Recovery

SQLite WAL mode provides crash-safe behaviour:

- The last **committed** SQLite transaction is always recoverable
- On Electron restart: schema migration check runs, Zustand stores are repopulated from SQLite
- Uncommitted state (unsaved auto-save debounce window — up to 500ms) may be lost

**Data loss window: maximum 500ms of typed content.** Acceptable for a developer tool.

---

## IPC Handler Error Contract

Every IPC handler is wrapped in a top-level try/catch. Unhandled exceptions in the main process never propagate to the renderer as unformatted errors.

```typescript
ipcMain.handle('artifact:approve', async (_, args) => {
  try {
    const result = await artifactEngine.approve(args.artifactId)
    return { ok: true, data: result }
  } catch (err) {
    logger.error('artifact:approve failed', { err, args })
    return { ok: false, error: toForgeError(err) }
  }
})
```
