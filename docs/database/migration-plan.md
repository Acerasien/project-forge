<!-- Source: database-design skill | Phase 7 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Migration Plan

How Forge's schema evolves safely over time — versioning, application strategy, safe change patterns, and rollback.

See [schema.md](schema.md) for the current schema (migration `001`).

---

## Philosophy

- Migrations are **numbered plain SQL files** — no TypeScript ORM owns the schema.
- Applied automatically on **application startup** — no manual CLI step.
- Each migration runs in a **SQLite transaction** — either all of it applies, or none of it does.
- A **pre-migration backup** is created before any pending migration runs.
- Migrations are **append-only** — never modify an already-applied migration file.

---

## Migration File Layout

```
src/
└── infrastructure/
    └── storage/
        └── sqlite/
            └── migrations/
                ├── 001_initial_schema.sql       ← all tables, FTS5, triggers, indexes
                ├── 002_add_settings_table.sql   ← future: if settings evolve
                └── NNN_description.sql          ← always sequential, never gaps
```

File naming: `{padded-3-digit-version}_{snake_case_description}.sql`

---

## Startup Migration Flow

```
LocalSQLiteAdapter.open(dbPath)
  │
  ├─ 1. Open SQLite connection
  ├─ 2. Apply PRAGMAs (WAL mode, FK enforcement, cache sizes)
  ├─ 3. CREATE TABLE IF NOT EXISTS schema_migrations (...)
  ├─ 4. SELECT MAX(version) FROM schema_migrations → currentVersion
  ├─ 5. Scan migrations/ directory → list pending SQL files (version > currentVersion)
  │
  ├─ [No pending migrations] → Ready
  │
  └─ [Pending migrations exist]
       ├─ 6. backupBeforeMigration()
       │      ├─ PRAGMA wal_checkpoint(TRUNCATE)   ← flush WAL to main DB file
       │      ├─ Copy forge.db → forge-backup-pre-migration-{YYYY-MM-DD}.db
       │      └─ On copy failure → abort with "Unable to back up — migration cancelled"
       │
       └─ 7. For each pending migration file (ascending order):
              ├─ BEGIN TRANSACTION
              ├─ Execute SQL file contents
              ├─ INSERT INTO schema_migrations (version, name, applied_at) VALUES (...)
              ├─ COMMIT
              └─ On error → ROLLBACK → abort startup with error screen showing:
                   "Migration {N} failed. Your data is safe. Backup at: {path}."
```

---

## Safe Change Patterns

### Adding a Column (Safe — direct)

```sql
-- migration NNN_add_task_labels.sql
BEGIN;

ALTER TABLE tasks ADD COLUMN labels TEXT;  -- Nullable by default — safe for existing rows

INSERT INTO schema_migrations (version, name) VALUES (NNN, 'add_task_labels');
COMMIT;
```

### Adding a Table (Safe — always)

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS initiative_tags (
  id            TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  tag           TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_tags_initiative ON initiative_tags(initiative_id);

INSERT INTO schema_migrations (version, name) VALUES (NNN, 'add_initiative_tags');
COMMIT;
```

### Adding an Index (Safe — non-blocking in SQLite)

```sql
BEGIN;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(task_status);
INSERT INTO schema_migrations (version, name) VALUES (NNN, 'add_task_status_index');
COMMIT;
```

### Renaming a Column (SQLite 3.25+ — verify Electron's bundled SQLite version)

```sql
BEGIN;
ALTER TABLE tasks RENAME COLUMN github_issue_number TO github_issue_id;
INSERT INTO schema_migrations (version, name) VALUES (NNN, 'rename_github_issue_number');
COMMIT;
```

### Removing a Column (SQLite 3.35+ — multi-step if older version)

```sql
-- For SQLite 3.35+:
BEGIN;
ALTER TABLE tasks DROP COLUMN system_design_ref;
INSERT INTO schema_migrations (version, name) VALUES (NNN, 'drop_system_design_ref');
COMMIT;

-- For older SQLite (rename-copy-drop pattern):
BEGIN;
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  -- ... all columns except the removed one
);
INSERT INTO tasks_new SELECT id, ... FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;
-- Recreate indexes
INSERT INTO schema_migrations (version, name) VALUES (NNN, 'drop_system_design_ref');
COMMIT;
```

### Changing a Column Type (Multi-step — always)

```sql
-- Step 1 (migration NNN): Add new column
ALTER TABLE artifacts ADD COLUMN content_v2 BLOB;

-- Step 2 (migration NNN+1): Migrate data
UPDATE artifacts SET content_v2 = CAST(content AS BLOB);

-- Step 3 (migration NNN+2): Rename columns (SQLite 3.25+)
ALTER TABLE artifacts RENAME COLUMN content TO content_old;
ALTER TABLE artifacts RENAME COLUMN content_v2 TO content;

-- Step 4 (migration NNN+3): Drop old column (SQLite 3.35+)
ALTER TABLE artifacts DROP COLUMN content_old;
```

Multi-step changes span multiple deployments — acceptable for a desktop app where all migrations run at startup.

---

## Rollback Strategy

SQLite does not support transactional DDL for all operations. Rollback strategy:

| Scenario | Recovery |
|---------|---------|
| Migration fails mid-transaction | ROLLBACK cancels partial changes. DB is in the pre-migration state. |
| Migration completes but app is broken | Restore from the pre-migration backup created in Step 6. |
| Backup file missing | User is shown the backup path and error details. Manual SQLite tools (DB Browser for SQLite) can be used to inspect/recover. |

**Rollback is always to the backup, not to a rollback migration script.** Rollback scripts that reverse DDL are brittle in SQLite — the backup approach is more reliable.

---

## Migration Version Table (v1)

| Version | Name | Contents |
|---------|------|---------|
| 001 | `initial_schema` | All 8 tables, FTS5 virtual table, 5 auto-update triggers, 3 FTS sync triggers, 10 indexes |

All v1 changes are additive. No migrations that delete data or remove columns ship in v1.

---

## PostgreSQL Compatibility

When `PostgreSQLStorageAdapter` is built, migrations are **separate files** for PostgreSQL. The migration framework (startup-applied, transaction-wrapped, version-tracked) is the same pattern — only the SQL dialect changes.

The Kysely query builder handles the dialect difference automatically — the `LocalSQLiteAdapter` and `PostgreSQLStorageAdapter` share the same Kysely query code.
