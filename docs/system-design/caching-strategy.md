<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Caching Strategy

What Forge caches, where it lives, and how it is invalidated.

---

## Overview

Forge is a local single-user desktop application backed by a synchronous SQLite database. There is no external cache layer (no Redis, no Memcached). The two active caches are:

1. **Zustand stores** — the UI's in-memory mirror of SQLite state (the primary cache)
2. **SQLite's FTS5 index** — the full-text search index, auto-maintained by triggers
3. **SQLite's page cache** — 64MB in-process memory cache managed by the SQLite engine

---

## Cache Inventory

| Cached Data                   | Cache Location                              | Lifetime                       | Invalidation Trigger                                 |
| ----------------------------- | ------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| Active Initiative + artifacts | Zustand `initiativeStore` + `artifactStore` | Until navigation away or write | Any successful write to that Initiative              |
| Initiative list (home screen) | Zustand `initiativeStore.initiatives`       | Session lifetime               | Initiative create / archive / delete                 |
| Active search results         | Zustand `searchStore.results`               | Until next search              | User changes search term (300ms debounce)            |
| AI draft preview              | Zustand `aiStore.draft`                     | Until apply or discard         | User applies or discards draft                       |
| User settings                 | Zustand `settingsStore`                     | Session lifetime               | Settings update                                      |
| FTS5 search index             | SQLite (`artifacts_fts` virtual table)      | Permanent (persisted)          | SQLite triggers on artifact INSERT / UPDATE / DELETE |
| SQLite page cache             | SQLite in-process                           | Process lifetime               | LRU eviction by SQLite engine                        |
| AI completions                | **Not cached**                              | N/A                            | Each AI generation is a fresh request                |
| GitHub API responses          | **Not cached**                              | N/A                            | Push is fire-and-forget                              |

---

## Cache-Aside Pattern (UI Layer)

```
1. User opens Initiative
2. Check Zustand store: is this Initiative loaded?
   → YES: render immediately from store (zero latency)
   → NO:  IPC call → main process reads SQLite → returns data
          → populate Zustand store → render
3. On any write: IPC response includes updated entity
   → update Zustand store with new data
   → React re-renders from updated store
```

---

## FTS5 Auto-Maintenance

SQLite FTS5 is kept in sync with the `artifacts` table via three triggers (defined in schema):

```
artifacts INSERT → artifacts_fts INSERT (title + content indexed)
artifacts UPDATE → artifacts_fts UPDATE (title + content re-indexed)
artifacts DELETE → artifacts_fts DELETE (row removed from index)
```

This means: **any artifact save automatically updates the search index.** No separate indexing job is needed.

---

## Cache Invalidation Rules

| Write Operation                | Zustand Stores Invalidated                                                     |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Create Initiative              | `initiativeStore.initiatives`                                                  |
| Archive / Delete Initiative    | `initiativeStore.initiatives` + `initiativeStore.activeInitiative` (if active) |
| Update artifact content        | `artifactStore.activeArtifact`                                                 |
| Approve / NeedsReview artifact | `artifactStore.activeArtifact` + all affected downstream artifacts             |
| Create / update Task           | `artifactStore` (Task is a child artifact)                                     |
| Create ADR                     | `artifactStore`                                                                |
| Add relationship               | `graphStore.relationships`                                                     |
| Update settings                | `settingsStore`                                                                |

**Rule:** Stores are never speculatively invalidated. Only the stores directly affected by a write operation are updated.

---

## What Is Deliberately Not Cached

| Item                      | Reason                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **AI completions**        | Each generation uses fresh Initiative context. Stale AI responses would be misleading. |
| **GitHub issue status**   | Forge does not pull from GitHub — push only. No pull-through caching needed.           |
| **Cross-Initiative data** | Loaded on demand. No need to prefetch other Initiatives while one is open.             |
