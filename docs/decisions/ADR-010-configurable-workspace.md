<!-- Source: system-design skill | Phase 6 decisions | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-010: User-Configurable Workspace Directory + Worker Thread Export

**Status:** ✅ Accepted  
**Date:** 2026-07-02  
**Resolves:** Q3 (workspace path), Q4 (export threading)

---

## Purpose

Define where Forge stores its data on the local filesystem and how the export operation is executed without blocking the UI.

---

## Context — Workspace Directory (Q3)

The SQLite database, logs, and export files must live somewhere on the user's filesystem. The design choice is whether this path is fixed by Forge or user-controlled.

**Key driver for user-configurability:** A user may want to point Forge's workspace to a cloud-synced folder (Dropbox, iCloud Drive, OneDrive) as a manual sync workaround before v2 cloud sync ships. This is explicitly out of scope as a first-class feature, but a user-configurable path enables it as a user-initiated workaround without Forge needing to implement sync logic.

---

## Decision — Workspace Directory

Forge uses a **user-configurable workspace directory**, defaulting to `~/Forge` on first launch.

**Workspace structure:**

```
~/Forge/                        ← default, user can move to any location
├── forge.db                    ← SQLite database (WAL mode)
├── forge.db-wal                ← WAL journal (managed by SQLite)
├── forge.db-shm                ← Shared memory file (managed by SQLite)
├── exports/                    ← Markdown export output
│   └── {initiative-name}/
│       ├── README.md
│       └── {artifact-type}.md
├── backups/                    ← forge-backup-{YYYY-MM-DD}.zip files
└── logs/                       ← forge-{YYYY-MM-DD}.log files
```

**Workspace configuration:**

- Stored in Electron's `app.getPath('userData')` config (not in the workspace itself — config survives workspace move)
- First-run: Forge creates `~/Forge/` automatically if it does not exist
- User can change workspace path in Settings → Workspace → "Move workspace"
- On path change: Forge copies `forge.db` to the new location, verifies integrity, then updates the config. Old location is not deleted automatically.

---

## Context — Export Threading (Q4)

Exporting a full Initiative (200+ artifacts, ADRs, tasks, AI sessions) involves:

1. Multiple SQLite reads (all tables for one initiative)
2. Markdown rendering and formatting for each entity
3. File writes to the filesystem

If run synchronously in the main process, a large export could block the Electron main process for 2–10 seconds, freezing the UI.

---

## Decision — Export Threading

Export operations run in a **`worker_threads` worker** with a progress UI in the renderer.

**Export flow:**

```
User clicks "Export Initiative" → UI shows progress modal (0%)
Main process: ExportService.exportInitiative(initiativeId, targetPath)
  → Spawns worker_thread: export.worker.ts
  → Worker reads from SQLite (its own connection to forge.db)
  → Worker posts progress events: { step: 'writing-requirements', percent: 34 }
  → Main process relays progress events → IPC → renderer → UI progress bar updates
  → Worker completes: { ok: true, outputPath }
  → Main process terminates worker
UI: show "Export complete" with "Open folder" button
```

**Worker thread SQLite access:** The worker opens its own read-only SQLite connection to `forge.db`. SQLite WAL mode allows concurrent readers — the main process writer and the export worker reader can coexist without blocking.

---

## Consequences

### Workspace Directory

✅ User can place the workspace in a cloud-synced folder (Dropbox, iCloud) as a manual v1 sync workaround.  
✅ Workspace is self-contained — backup is as simple as copying the directory.  
✅ Config (workspace path) survives workspace moves.  
⚠️ If the user moves the workspace manually (outside Forge), Forge loses the path and must prompt for re-location on next launch.  
⚠️ Multiple workspaces are not supported in v1 — only one active workspace at a time.

### Export Worker

✅ Main process and UI remain fully responsive during export.  
✅ Progress UI gives user feedback on large exports.  
✅ SQLite WAL mode enables the worker's read-only connection to coexist with main process writes.  
⚠️ Worker thread adds implementation complexity (message passing, worker lifecycle management) vs. a blocking approach.  
⚠️ The export worker must handle errors and post them back to the main process — unhandled exceptions in workers do not propagate automatically.

---

## Future Considerations

- **Multiple workspaces (v2):** When team collaboration is introduced, each team workspace may be a separate directory. The workspace selection UI would need to support switching between workspaces.
- **Cloud sync (v2):** The user-configurable workspace path is the foundation for v2 cloud sync — the `CloudStorageAdapter` will replace the local filesystem reading, using the same directory structure as a local cache.
- **Backup automation:** A scheduled backup (e.g., daily `forge-backup-{date}.zip`) could be added as a background process in v2 without architectural changes.
