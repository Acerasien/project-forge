<!-- Source: database-design skill | Phase 7 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Query Catalog

8 critical SQL queries used by Forge's application services. Includes N+1 analysis.

See [schema.md](schema.md) for table definitions.  
See [indexing-strategy.md](indexing-strategy.md) for which index each query uses.  
See [../system-design/data-flow.md](../system-design/data-flow.md) for the sequence diagrams that invoke these queries.

---

## Q1 — Home Screen: Active Initiatives (with Progress)

**Used by:** `InitiativeManager.listActive()`  
**Index:** `idx_initiatives_status_updated`, `idx_artifacts_initiative_type_status`, `idx_tasks_initiative_sort`

```sql
SELECT
  i.id,
  i.name,
  i.description,
  i.status,
  i.updated_at,
  COUNT(DISTINCT a.id)                                              AS artifact_count,
  COUNT(DISTINCT CASE WHEN a.status = 'Approved' THEN a.id END)   AS approved_count,
  COUNT(DISTINCT t.id)                                             AS task_total,
  COUNT(DISTINCT CASE WHEN t.task_status = 'Done' THEN t.id END)  AS task_done
FROM initiatives i
LEFT JOIN artifacts a ON a.initiative_id = i.id
LEFT JOIN tasks     t ON t.initiative_id = i.id
WHERE i.status != 'Archived'
GROUP BY i.id
ORDER BY i.updated_at DESC;
```

**N+1 resolved:** Single aggregated query. No per-initiative follow-up queries.

---

## Q2 — Load Initiative Detail (Artifacts Only)

**Used by:** `InitiativeManager.get(initiativeId)` → first of 4 targeted queries  
**Index:** `idx_artifacts_initiative_type_status` (leading column `initiative_id`)

```sql
SELECT id, type, title, status, version, created_at, updated_at
FROM artifacts
WHERE initiative_id = ?
ORDER BY
  CASE type
    WHEN 'Vision'       THEN 1
    WHEN 'Requirements' THEN 2
    WHEN 'Architecture' THEN 3
    WHEN 'SystemDesign' THEN 4
  END;
```

**Note:** Content is loaded separately only when the user opens a specific artifact — prevents loading large Markdown blobs for all artifacts on Initiative open.

```sql
-- On-demand: load content for a single artifact
SELECT content, version FROM artifacts WHERE id = ?;
```

---

## Q3 — Approval Gate Check

**Used by:** `WorkflowEngine.checkGates(artifact)`  
**Index:** `idx_artifacts_initiative_type_status` (all 3 columns used)

```sql
-- Example: gate check for Architecture approval (requires Vision + Requirements Approved)
SELECT type, status
FROM artifacts
WHERE initiative_id = ?
  AND type IN ('Vision', 'Requirements')
ORDER BY type;

-- WorkflowEngine interprets: if any row has status != 'Approved' → gate not passed
```

The gate definition (which types are required upstream for each artifact type) is a domain rule, not stored in the database.

---

## Q4 — Downstream NeedsReview Cascade (Recursive CTE)

**Used by:** `WorkflowEngine.handleApprovalRevoked(artifactId)` and `GraphService.getDownstream()`  
**Index:** `idx_relationships_source`

```sql
WITH RECURSIVE downstream(node_id, depth) AS (
  -- Base: direct outbound edges from the edited artifact
  SELECT target_id, 1
  FROM artifact_relationships
  WHERE source_id = ?

  UNION ALL

  -- Recursive: follow edges from each discovered node
  SELECT ar.target_id, d.depth + 1
  FROM artifact_relationships ar
  INNER JOIN downstream d ON d.node_id = ar.source_id
  WHERE d.depth < 10   -- Safety bound; DAG invariant prevents loops in practice
)
SELECT DISTINCT node_id, depth FROM downstream
ORDER BY depth;
```

**DAG invariant** (enforced by `GraphService` on every edge insertion) guarantees this terminates. The `depth < 10` bound is a safety net for unexpected bugs, not normal operation.

---

## Q5 — Full-Text Search

**Used by:** `SearchIndex.query(term)`  
**Index:** FTS5 internal B-tree

```sql
SELECT
  a.id            AS artifact_id,
  a.initiative_id,
  a.type,
  a.title,
  snippet(artifacts_fts, 4, '**', '**', '…', 32) AS snippet,
  rank
FROM artifacts_fts
JOIN artifacts a ON a.id = artifacts_fts.artifact_id
WHERE artifacts_fts MATCH ?          -- ? = sanitised user input
ORDER BY rank
LIMIT 25;
```

**Input sanitisation:** User input passed to `MATCH` must be sanitised before use (escape special FTS5 characters: `"`, `*`, `^`, `(`, `)`, `-`). `SearchIndex` handles this.

**Porter stemming:** `tokenize = 'porter unicode61'` means searching `"implement"` also returns rows containing `"implemented"`, `"implementation"`, `"implementing"`.

---

## Q6 — Next ADR Sequence Number

**Used by:** `ArtifactEngine.createADR(initiativeId, ...)`  
**Index:** UNIQUE(initiative_id, seq_number) implicit index

```sql
SELECT COALESCE(MAX(seq_number), 0) + 1 AS next_seq
FROM adrs
WHERE initiative_id = ?;
```

Always computed from the table — never stored or cached. Ensures sequential numbers even if an ADR is deleted (deleted numbers are not reused — the next number is always MAX + 1).

---

## Q7 — Graph: Load All Nodes and Edges for an Initiative

**Used by:** `GraphService.getInitiativeGraph(initiativeId)`  
**Index:** All `idx_*_initiative` indexes + `idx_relationships_source`

```sql
-- Step 1: Collect all entity IDs for this initiative
-- (Used as the IN clause for the edge query below)

-- Step 2: Load all edges where at least one endpoint belongs to the initiative
SELECT source_id, target_id, type, created_at
FROM artifact_relationships
WHERE source_id IN (
  SELECT id FROM artifacts   WHERE initiative_id = ?
  UNION ALL
  SELECT id FROM adrs        WHERE initiative_id = ?
  UNION ALL
  SELECT id FROM tasks       WHERE initiative_id = ?
  UNION ALL
  SELECT id FROM ai_sessions WHERE initiative_id = ?
);

-- Step 3: Load all node types (4 targeted queries, run in parallel at app layer)
SELECT id, type, title, status FROM artifacts   WHERE initiative_id = ?;
SELECT id, seq_number, title, adr_status FROM adrs WHERE initiative_id = ?;
SELECT id, title, task_status, priority FROM tasks WHERE initiative_id = ?;
SELECT id, name, session_status, artifact_id FROM ai_sessions WHERE initiative_id = ?;
```

**N+1 resolved:** GraphService loads all nodes from 4 targeted queries, builds an in-memory ID → node map, then resolves edge source/target IDs against the map. Zero per-node follow-up queries.

---

## Q8 — Export: Full Initiative Data Snapshot

**Used by:** `ExportService` in a `worker_threads` worker  
**Index:** All `idx_*_initiative` indexes  
**Connection:** Read-only SQLite connection (WAL mode allows concurrent readers)

```sql
-- Run inside a BEGIN / COMMIT block for read consistency
BEGIN;

SELECT * FROM initiatives WHERE id = ?;

SELECT * FROM artifacts
WHERE initiative_id = ?
ORDER BY CASE type
  WHEN 'Vision' THEN 1 WHEN 'Requirements' THEN 2
  WHEN 'Architecture' THEN 3 WHEN 'SystemDesign' THEN 4
END;

SELECT * FROM adrs
WHERE initiative_id = ?
ORDER BY seq_number;

SELECT * FROM tasks
WHERE initiative_id = ?
ORDER BY sort_order;

SELECT id, name, artifact_id, provider, model, session_status, accepted_content, created_at
FROM ai_sessions
WHERE initiative_id = ?
ORDER BY created_at;

SELECT ar.*
FROM artifact_relationships ar
WHERE ar.source_id IN (
  SELECT id FROM artifacts   WHERE initiative_id = ?
  UNION ALL
  SELECT id FROM adrs        WHERE initiative_id = ?
  UNION ALL
  SELECT id FROM tasks       WHERE initiative_id = ?
  UNION ALL
  SELECT id FROM ai_sessions WHERE initiative_id = ?
);

COMMIT;
```

**Note:** AI session `prompt` and `response` are **excluded** from the export snapshot unless the user specifically requests "Export with AI Sessions". These fields can be very large and are typically not needed in the Markdown export.

---

## N+1 Analysis Summary

| Risk                                         | Detected?   | Resolution                                                                 |
| -------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| Home screen: per-initiative artifact counts  | ✅ Detected | Fixed: single JOIN with `COUNT(DISTINCT)` aggregates (Q1)                  |
| Graph: per-node entity resolution            | ✅ Detected | Fixed: batch load all nodes in 4 queries, resolve in memory (Q7)           |
| Initiative detail: per-artifact content load | ✅ Detected | Fixed: content loaded on-demand only when artifact is opened (Q2)          |
| AI session list: per-session content load    | ✅ Detected | Fixed: list queries exclude prompt/response; loaded lazily on session open |
