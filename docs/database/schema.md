<!-- Source: database-design skill | Phase 7 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Schema

Complete DDL for all Forge v1 database tables, FTS5 virtual table, triggers, and SQLite configuration.

See [erd.md](erd.md) for the entity relationship diagram.  
See [../decisions/ADR-005-sqlite-persistence.md](../decisions/ADR-005-sqlite-persistence.md) for the SQLite selection rationale.  
See [../decisions/ADR-006-artifact-graph-model.md](../decisions/ADR-006-artifact-graph-model.md) for the graph model rationale.

---

## SQLite Configuration

Applied on every `open()` call before any queries:

```sql
PRAGMA journal_mode       = WAL;         -- Write-Ahead Logging: crash-safe + concurrent readers
PRAGMA foreign_keys       = ON;          -- Enforce referential integrity
PRAGMA synchronous        = NORMAL;      -- Safe with WAL; faster than FULL
PRAGMA cache_size         = -65536;      -- 64 MB in-memory page cache
PRAGMA temp_store         = MEMORY;      -- Temp tables in memory, not on disk
PRAGMA mmap_size          = 268435456;   -- 256 MB memory-mapped I/O
PRAGMA wal_autocheckpoint = 1000;        -- Checkpoint WAL every 1000 pages
```

---

## Table: `schema_migrations`

Tracks applied migrations. Created before all other tables — always the first CREATE in migration `001`.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  applied_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

---

## Table: `initiatives`

The primary object in Forge — every artifact, ADR, task, and AI session belongs to an Initiative.

```sql
CREATE TABLE IF NOT EXISTS initiatives (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL
              CHECK(length(trim(name)) > 0 AND length(name) <= 200),
  description TEXT,
  status      TEXT    NOT NULL DEFAULT 'Discovery'
              CHECK(status IN ('Discovery', 'InProgress', 'Released', 'Archived')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TRIGGER IF NOT EXISTS initiatives_updated_at
AFTER UPDATE ON initiatives
WHEN old.updated_at = new.updated_at BEGIN
  UPDATE initiatives SET updated_at = datetime('now', 'utc') WHERE id = new.id;
END;
```

**Status values:** `Discovery` → `InProgress` → `Released`. `Archived` is a terminal state set manually.  
**Status derivation:** `status` is recalculated by `WorkflowEngine` whenever an artifact is approved or reverted — it is not manually set by the user.

---

## Table: `artifacts`

Vision, Requirements, Architecture, and System Design documents. Tasks and AI Sessions have separate tables with richer schemas.

```sql
CREATE TABLE IF NOT EXISTS artifacts (
  id              TEXT    PRIMARY KEY,
  initiative_id   TEXT    NOT NULL
                  REFERENCES initiatives(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL
                  CHECK(type IN ('Vision', 'Requirements', 'Architecture', 'SystemDesign')),
  title           TEXT    NOT NULL,
  content         TEXT,           -- Markdown source; NULL for newly scaffolded, empty artifacts
  status          TEXT    NOT NULL DEFAULT 'Draft'
                  CHECK(status IN ('Draft', 'Approved', 'NeedsReview')),
  version         INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TRIGGER IF NOT EXISTS artifacts_updated_at
AFTER UPDATE ON artifacts
WHEN old.updated_at = new.updated_at BEGIN
  UPDATE artifacts SET updated_at = datetime('now', 'utc') WHERE id = new.id;
END;
```

**`content` is nullable:** Forge pre-scaffolds empty artifact slots when an Initiative is created. Content starts NULL and is populated as the user writes.  
**`version`** increments on every content change — provides a simple optimistic concurrency token for the v2 cloud sync path.  
**`ON DELETE CASCADE`:** Deleting an Initiative removes all its artifacts (and cascades further to ai_sessions and tasks referencing those artifacts — via their own FK constraints).

---

## Table: `adrs`

Architecture Decision Records. Immutable content once `adr_status = 'Accepted'` — enforced by `ArtifactEngine`.

```sql
CREATE TABLE IF NOT EXISTS adrs (
  id                TEXT    PRIMARY KEY,
  initiative_id     TEXT    NOT NULL
                    REFERENCES initiatives(id) ON DELETE CASCADE,
  seq_number        INTEGER NOT NULL CHECK(seq_number > 0),
  title             TEXT    NOT NULL,
  adr_status        TEXT    NOT NULL DEFAULT 'Proposed'
                    CHECK(adr_status IN ('Proposed', 'Accepted', 'Deprecated', 'Superseded')),
  context           TEXT,
  decision          TEXT,
  consequences      TEXT,
  alternatives      TEXT,
  superseded_by_id  TEXT    REFERENCES adrs(id) ON DELETE SET NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now', 'utc')),
  UNIQUE(initiative_id, seq_number)
);

CREATE TRIGGER IF NOT EXISTS adrs_updated_at
AFTER UPDATE ON adrs
WHEN old.updated_at = new.updated_at BEGIN
  UPDATE adrs SET updated_at = datetime('now', 'utc') WHERE id = new.id;
END;
```

**`UNIQUE(initiative_id, seq_number)`:** ADR numbers never reused within an Initiative — enforced at schema level. This implicit unique index also covers the `ORDER BY seq_number` sort on the ADR list query.  
**`superseded_by_id SET NULL`:** If the replacement ADR is deleted, the original loses its supersession pointer but is not itself deleted.  
**Content immutability:** Not enforceable purely at schema level (SQLite has no row-state-dependent write guards). `ArtifactEngine` rejects content writes when `adr_status = 'Accepted'`.

---

## Table: `tasks`

Implementation tasks derived from Requirements. Schema-level "no orphan tasks" enforcement via `RESTRICT`.

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id                  TEXT    PRIMARY KEY,
  initiative_id       TEXT    NOT NULL
                      REFERENCES initiatives(id) ON DELETE CASCADE,
  title               TEXT    NOT NULL,
  description         TEXT,
  task_status         TEXT    NOT NULL DEFAULT 'Todo'
                      CHECK(task_status IN ('Todo', 'InProgress', 'Done', 'Blocked')),
  priority            TEXT    NOT NULL DEFAULT 'ShouldHave'
                      CHECK(priority IN ('MustHave', 'ShouldHave', 'CouldHave', 'WontHave')),
  requirement_id      TEXT    NOT NULL
                      REFERENCES artifacts(id) ON DELETE RESTRICT,
  system_design_ref   TEXT,   -- Optional free-text reference to a System Design section
  github_issue_number INTEGER,
  github_repo         TEXT,   -- "owner/repo" — stored alongside issue number for self-contained links
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TRIGGER IF NOT EXISTS tasks_updated_at
AFTER UPDATE ON tasks
WHEN old.updated_at = new.updated_at BEGIN
  UPDATE tasks SET updated_at = datetime('now', 'utc') WHERE id = new.id;
END;
```

**`requirement_id ON DELETE RESTRICT`:** Prevents deleting a Requirements artifact while Tasks reference it. Deletion must explicitly remove or relink tasks first. Enforces the domain rule "no orphan tasks" at the schema level.  
**`sort_order`:** Enables manual task ordering within an Initiative. Default `0`; reordering updates this column.

---

## Table: `ai_sessions`

Read-only records of AI-assisted interactions. No `updated_at` — sessions are immutable after creation.

```sql
CREATE TABLE IF NOT EXISTS ai_sessions (
  id               TEXT NOT NULL PRIMARY KEY,
  initiative_id    TEXT NOT NULL
                   REFERENCES initiatives(id) ON DELETE CASCADE,
  artifact_id      TEXT NOT NULL
                   REFERENCES artifacts(id) ON DELETE RESTRICT,
  provider         TEXT NOT NULL
                   CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama', 'lmstudio')),
  model            TEXT NOT NULL,   -- e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022'
  name             TEXT NOT NULL,
  prompt           TEXT NOT NULL,
  response         TEXT NOT NULL,
  accepted_content TEXT,            -- NULL if session was discarded
  session_status   TEXT NOT NULL DEFAULT 'pending-review'
                   CHECK(session_status IN ('pending-review', 'accepted', 'discarded')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

**`artifact_id ON DELETE RESTRICT`:** Prevents deleting an artifact that has AI Sessions. The domain rule "AI Sessions linked to Approved artifacts cannot be deleted" is additionally enforced at the application layer — RESTRICT prevents any deletion at the schema level.  
**`provider` and `model`** recorded at session creation — complete provenance even if the provider is later changed.  
**No `updated_at`:** AI Sessions are strictly read-only after creation. There is no update path in the `StoragePort` interface for ai_sessions.

---

## Table: `artifact_relationships`

The engineering graph — first-class typed directed edges connecting any two entities.

```sql
CREATE TABLE IF NOT EXISTS artifact_relationships (
  id          TEXT NOT NULL PRIMARY KEY,
  source_id   TEXT NOT NULL,  -- UUID of any entity: artifact, adr, task, or ai_session
  target_id   TEXT NOT NULL,  -- UUID of any entity
  type        TEXT NOT NULL
              CHECK(type IN (
                'DerivedFrom',    -- Task ← Requirement
                'InformedBy',     -- Architecture/ADR ← Requirement
                'DecidedBy',      -- Architecture component ← ADR
                'Implements',     -- System Design ← Architecture
                'Generated',      -- AI Session → Artifact
                'SupersededBy'    -- ADR ← replacement ADR
              )),
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  UNIQUE(source_id, target_id, type)  -- No duplicate edges of the same type
);
```

**No FK constraints on `source_id`/`target_id`:** SQLite FKs reference exactly one table. Since graph nodes span four tables, FKs are not applicable here. `GraphService` validates entity existence before inserting edges and enforces the DAG invariant (no cycles) in application code.  
**`UNIQUE(source_id, target_id, type)`:** Prevents duplicate edges. Two entities can have multiple edges of _different_ types (e.g., an ADR both `InformedBy` and `DecidedBy` the same artifact), but not two edges of the _same_ type.

---

## Table: `settings`

Workspace-scoped key-value configuration store.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT NOT NULL PRIMARY KEY,
  value      TEXT,            -- JSON-encoded — supports both primitive and structured values
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TRIGGER IF NOT EXISTS settings_updated_at
AFTER UPDATE ON settings
WHEN old.updated_at = new.updated_at BEGIN
  UPDATE settings SET updated_at = datetime('now', 'utc') WHERE key = new.key;
END;
```

**Known keys (v1):**

| Key                    | Type    | Description                                                                                 |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `ai_provider`          | string  | Active AI provider: `'openai'` \| `'anthropic'` \| `'gemini'` \| `'ollama'` \| `'lmstudio'` |
| `ai_model`             | string  | Selected model name for the active provider                                                 |
| `ai_base_url`          | string  | Custom base URL for Ollama/LM Studio (overrides default localhost)                          |
| `ai_max_output_tokens` | number  | User-configured max output token limit (null = provider default)                            |
| `ai_timeout_seconds`   | number  | Request timeout (default: 60)                                                               |
| `github_repo`          | string  | Default GitHub repository for Task push (`owner/repo`)                                      |
| `theme`                | string  | `'system'` \| `'light'` \| `'dark'`                                                         |
| `telemetry_opt_in`     | boolean | `false` by default — user must explicitly opt in                                            |

---

## Virtual Table: `artifacts_fts` (FTS5 Full-Text Search)

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(
  artifact_id   UNINDEXED,
  initiative_id UNINDEXED,
  type          UNINDEXED,
  title,
  content,
  content     = 'artifacts',
  content_rowid = 'rowid',
  tokenize    = 'porter unicode61'
  -- Porter stemming: 'implement' matches 'implemented', 'implementing', 'implementation'
);
```

### FTS5 Sync Triggers

```sql
CREATE TRIGGER IF NOT EXISTS artifacts_fts_insert
AFTER INSERT ON artifacts BEGIN
  INSERT INTO artifacts_fts(artifact_id, initiative_id, type, title, content)
  VALUES (new.id, new.initiative_id, new.type, new.title, new.content);
END;

-- Only fires when title or content changes — not on status/version updates
CREATE TRIGGER IF NOT EXISTS artifacts_fts_update
AFTER UPDATE OF title, content ON artifacts BEGIN
  UPDATE artifacts_fts
  SET title = new.title, content = new.content
  WHERE artifact_id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS artifacts_fts_delete
AFTER DELETE ON artifacts BEGIN
  DELETE FROM artifacts_fts WHERE artifact_id = old.id;
END;
```

---

## First Migration File (`001_initial_schema.sql`)

The schema above is packaged as migration `001`. Applied on first launch. Every subsequent schema change is a new numbered migration file.
