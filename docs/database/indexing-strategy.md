<!-- Source: database-design skill | Phase 7 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Indexing Strategy

12 query patterns systematically mapped to 10 indexes. Every index exists for a specific query reason.

See [schema.md](schema.md) for the full DDL that includes all `CREATE INDEX` statements.  
See [query-catalog.md](query-catalog.md) for the SQL of each query pattern.

---

## Index Philosophy

- **Index FK columns** that appear in JOIN or WHERE conditions.
- **Composite indexes** — equality columns first, then range/sort columns (SQLite B-tree traversal matches this order).
- **Don't over-index write-heavy tables** — `artifact_relationships` is write-moderate; the two traversal indexes are sufficient.
- **FTS5 maintains its own internal B-tree** — no additional index needed on `artifacts.content`.

---

## Query Pattern → Index Mapping

| #   | Query                                     | Filter Columns                | Sort              | Index Used                                              |
| --- | ----------------------------------------- | ----------------------------- | ----------------- | ------------------------------------------------------- |
| Q1  | Home screen — active initiatives          | `status != 'Archived'`        | `updated_at DESC` | `idx_initiatives_status_updated`                        |
| Q2  | Load all artifacts for initiative         | `initiative_id`               | —                 | `idx_artifacts_initiative_type_status` (leading column) |
| Q3  | Approval gate check — upstream approved   | `initiative_id, type, status` | —                 | `idx_artifacts_initiative_type_status` (all 3 columns)  |
| Q4  | NeedsReview cascade — downstream CTE      | `source_id` (recursive)       | —                 | `idx_relationships_source`                              |
| Q5  | Load all ADRs for initiative              | `initiative_id`               | `seq_number ASC`  | UNIQUE(initiative_id, seq_number) implicit index        |
| Q6  | Load tasks for initiative                 | `initiative_id`               | `sort_order ASC`  | `idx_tasks_initiative_sort`                             |
| Q7  | Get tasks by requirement                  | `requirement_id`              | —                 | `idx_tasks_requirement`                                 |
| Q8  | Get AI sessions for artifact              | `artifact_id`                 | `created_at DESC` | `idx_ai_sessions_artifact`                              |
| Q9  | Full-text search                          | FTS5 MATCH                    | `rank`            | FTS5 internal index                                     |
| Q10 | Graph — all edges for initiative          | `source_id IN (...)`          | —                 | `idx_relationships_source`                              |
| Q11 | Graph — reverse lookup (what points to X) | `target_id`                   | —                 | `idx_relationships_target`                              |
| Q12 | Export — all data for initiative          | `initiative_id`               | —                 | All `idx_*_initiative` indexes                          |

---

## Index Definitions

```sql
-- initiatives
CREATE INDEX IF NOT EXISTS idx_initiatives_status_updated
  ON initiatives(status, updated_at DESC);
-- Q1: filters by status, sorts by updated_at — composite covers both in one scan

-- artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_initiative_type_status
  ON artifacts(initiative_id, type, status);
-- Q2: initiative_id leading column covers all-artifacts queries
-- Q3: full composite covers the gate check (initiative_id + type + status all equality)
-- Column order: initiative_id (highest selectivity per-query) → type → status

-- adrs: UNIQUE(initiative_id, seq_number) creates an implicit index
-- No additional CREATE INDEX needed for Q5

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_initiative_sort
  ON tasks(initiative_id, sort_order ASC);
-- Q6: initiative_id equality + sort_order sort — sort is "free" from index order

CREATE INDEX IF NOT EXISTS idx_tasks_requirement
  ON tasks(requirement_id);
-- Q7: "show all tasks from this requirement" — graph reverse lookup

-- ai_sessions
CREATE INDEX IF NOT EXISTS idx_ai_sessions_artifact
  ON ai_sessions(artifact_id, created_at DESC);
-- Q8: artifact lookup with newest-first sort

CREATE INDEX IF NOT EXISTS idx_ai_sessions_initiative
  ON ai_sessions(initiative_id);
-- Q12: export path — load all sessions for initiative

-- artifact_relationships
CREATE INDEX IF NOT EXISTS idx_relationships_source
  ON artifact_relationships(source_id);
-- Q4, Q10: forward graph traversal starting point

CREATE INDEX IF NOT EXISTS idx_relationships_target
  ON artifact_relationships(target_id);
-- Q11: reverse lookup — "what nodes point to X?"

CREATE INDEX IF NOT EXISTS idx_relationships_type_source
  ON artifact_relationships(type, source_id);
-- Filtered traversal: "get all DerivedFrom edges from node X"
-- type first (equality) → source_id (equality) — both are equality filters
```

---

## Index Rationale Details

### `idx_initiatives_status_updated`

```
WHERE status != 'Archived'    ← covered by status column (leading)
ORDER BY updated_at DESC       ← covered by updated_at (trailing, DESC)
```

Without this index, the home screen query would require a full table scan + sort. Since Initiatives are infrequently written but frequently read, the index cost is justified.

---

### `idx_artifacts_initiative_type_status` (Covers Q2 and Q3)

This composite serves two distinct queries with the same index because both share `initiative_id` as the equality leading column:

```
Q2: WHERE initiative_id = ?
    → SQLite uses the first column of the index only

Q3: WHERE initiative_id = ? AND type IN ('Vision', 'Requirements') AND status = 'Approved'
    → SQLite uses all three columns — equality on each, no range scan needed
```

Column order matters: `initiative_id` first because it eliminates the most rows (high selectivity per query). `type` second (4 values, moderate). `status` third (3 values, low cardinality but still useful for gate checks).

---

### `idx_tasks_initiative_sort`

```
WHERE initiative_id = ?
ORDER BY sort_order ASC
```

Including `sort_order` in the index means the sort requires no additional step — SQLite traverses the index in order and returns rows already sorted. This matters for task lists which are always sorted by `sort_order`.

---

### Why No Index on `artifact_relationships.type` Alone

A standalone `type` index would have low cardinality (6 values) and would not eliminate enough rows to be useful. The composite `idx_relationships_type_source` covers the filtered traversal case. The source and target indexes cover the general traversal cases.

---

## Total Index Count: 10

| Table                    | Indexes    | Notes                                             |
| ------------------------ | ---------- | ------------------------------------------------- |
| `initiatives`            | 1          | + PK on `id`                                      |
| `artifacts`              | 1          | + PK on `id`                                      |
| `adrs`                   | 0 explicit | UNIQUE(initiative_id, seq_number) serves as index |
| `tasks`                  | 2          | + PK on `id`, FK on `requirement_id`              |
| `ai_sessions`            | 2          | + PK on `id`                                      |
| `artifact_relationships` | 3          | + PK on `id`, UNIQUE on (source, target, type)    |
| `settings`               | 0 explicit | PK lookup only                                    |
| `artifacts_fts`          | internal   | FTS5 manages its own B-tree index                 |
