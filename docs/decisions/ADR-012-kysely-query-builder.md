<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-012: Kysely as Query Builder within LocalSQLiteAdapter

**Status:** ✅ Accepted  
**Date:** 2026-07-02  
**Resolves:** Phase 7 Database Design — ORM/query builder selection

---

## Purpose

Select the query construction strategy within `LocalSQLiteAdapter` to ensure type-safe, maintainable SQL without the overhead of a full ORM.

---

## Context

The `StoragePort` interface (ADR-003) abstracts all persistence from the application and domain layers. The question is: how does `LocalSQLiteAdapter` construct queries internally?

Three options were evaluated:
1. **Raw SQL strings** — type-unsafe, error-prone column name references
2. **Kysely** — TypeScript query builder, SQL-semantic, no code generation
3. **Drizzle ORM** — TypeScript schema definition, generates migrations
4. **Prisma** — server-oriented ORM, generates a client

The key constraint: the `LocalSQLiteAdapter` must remain the sole owner of SQL. The application layer never writes SQL. The schema is owned by plain `.sql` migration files (not by a TypeScript ORM schema definition).

---

## Decision

Use **Kysely** as the SQL query builder inside `LocalSQLiteAdapter`, connected to `better-sqlite3` via `kysely-better-sqlite3` dialect.

```
LocalSQLiteAdapter (implements StoragePort)
  └── Kysely<Database> query builder
      └── BetterSqlite3Dialect
          └── better-sqlite3 (synchronous)
              └── SQLite forge.db
```

**Kysely is an implementation detail of `LocalSQLiteAdapter` only.** No Kysely types are exposed through `StoragePort`. The application layer sees only the domain types (Initiative, Artifact, etc.) returned by `StoragePort` methods.

---

## Alternatives

| Alternative | Why Rejected |
|-------------|-------------|
| **Raw SQL strings** | Column name typos are runtime errors. Hard to refactor when schema evolves. No TypeScript completion. Acceptable for trivial apps; risky for a 3-year solo project. |
| **Drizzle ORM** | TypeScript-first and SQLite-native — closest alternative. Rejected because Drizzle owns the schema definition in TypeScript, conflicting with the decision to own schema in plain `.sql` migration files. Migration portability to PostgreSQL is cleaner with SQL files. |
| **Prisma** | Server-oriented, generates a Prisma Client, has its own migration tool. Does not support `better-sqlite3` natively. Overkill for a local desktop app. |
| **TypeORM** | Decorator-heavy, significant version churn, poor SQLite support track record. |

---

## Consequences

✅ Type-safe query construction — column name errors are caught at compile time.  
✅ Auto-completion for table/column names in all queries.  
✅ Kysely works with `kysely-better-sqlite3` dialect — plugs directly into the existing `better-sqlite3` synchronous API.  
✅ When `PostgreSQLStorageAdapter` is built, the same Kysely query code works with the PostgreSQL dialect — only the dialect and connection initialization change.  
✅ No code generation step — Kysely types are hand-written, matching the `StoragePort` interface.  
⚠️ Kysely is an additional dependency. Monitor for breaking changes between major versions.  
⚠️ The `Database` interface type (Kysely's schema definition in TypeScript) must be kept in sync with the SQL migration files. This is a manual responsibility — no automated sync.

---

## Future Considerations

- When `PostgreSQLStorageAdapter` is implemented, use `KyselyPostgresDialect` with the same query file structure. The `Database` TypeScript interface is shared between both adapters.
- If schema complexity grows significantly, evaluate whether Drizzle's schema-as-source-of-truth model becomes worthwhile. For v1, plain SQL files + Kysely types is the right balance.
