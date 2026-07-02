import Database from 'better-sqlite3'
import { createHash } from 'crypto'

export interface Migration {
  version: number
  name: string
  up: string
}

export class MigrationEngine {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  private computeChecksum(up: string): string {
    return createHash('sha256').update(up).digest('hex')
  }

  public setup(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _forge_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT,
        duration_ms INTEGER,
        status TEXT,
        app_version TEXT
      )
    `)

    // Attempt to add columns if upgrading from old schema
    try {
      this.db.exec('ALTER TABLE _forge_migrations ADD COLUMN checksum TEXT')
    } catch {
      // column already exists
    }
    try {
      this.db.exec('ALTER TABLE _forge_migrations ADD COLUMN duration_ms INTEGER')
    } catch {
      // column already exists
    }
    try {
      this.db.exec('ALTER TABLE _forge_migrations ADD COLUMN status TEXT')
    } catch {
      // column already exists
    }
    try {
      this.db.exec('ALTER TABLE _forge_migrations ADD COLUMN app_version TEXT')
    } catch {
      // column already exists
    }
  }

  public getAppliedMigrations(): {
    version: number
    name: string
    checksum: string | null
    status: string | null
  }[] {
    this.setup()
    return this.db
      .prepare(
        `
      SELECT version, name, checksum, status FROM _forge_migrations ORDER BY version ASC
    `
      )
      .all() as { version: number; name: string; checksum: string | null; status: string | null }[]
  }

  public applyMigrations(migrations: Migration[], appVersion: string = '1.0.0'): void {
    this.setup()

    const applied = this.getAppliedMigrations()
    const appliedMap = new Map(applied.map((m) => [m.version, m]))

    // Verify checksums of already applied migrations
    for (const migration of migrations) {
      const appliedMigration = appliedMap.get(migration.version)
      if (appliedMigration && appliedMigration.status === 'success' && appliedMigration.checksum) {
        const currentChecksum = this.computeChecksum(migration.up)
        if (currentChecksum !== appliedMigration.checksum) {
          throw new Error(
            `Migration checksum mismatch for version ${migration.version} (${migration.name}). ` +
              `Expected ${appliedMigration.checksum} but got ${currentChecksum}. ` +
              `This means a previously applied migration was modified.`
          )
        }
      }
    }

    const pending = migrations
      .filter((m) => !appliedMap.has(m.version) || appliedMap.get(m.version)?.status === 'failed')
      .sort((a, b) => a.version - b.version)

    if (pending.length === 0) {
      return
    }

    for (const migration of pending) {
      const checksum = this.computeChecksum(migration.up)
      const startTime = performance.now()
      let status = 'failed'

      try {
        this.db.transaction(() => {
          this.db.exec(migration.up)
        })()
        status = 'success'
      } catch (error) {
        // If it fails, we still want to log the failure, but then throw to stop further migrations
        this.logMigration(migration, checksum, performance.now() - startTime, 'failed', appVersion)
        throw new Error(
          `Migration ${migration.version} (${migration.name}) failed: ${(error as Error).message}`
        )
      }

      this.logMigration(migration, checksum, performance.now() - startTime, status, appVersion)
    }
  }

  private logMigration(
    migration: Migration,
    checksum: string,
    durationMs: number,
    status: string,
    appVersion: string
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO _forge_migrations (version, name, checksum, duration_ms, status, app_version)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(version) DO UPDATE SET 
        checksum = excluded.checksum,
        duration_ms = excluded.duration_ms,
        status = excluded.status,
        app_version = excluded.app_version,
        applied_at = CURRENT_TIMESTAMP
    `
      )
      .run(migration.version, migration.name, checksum, Math.round(durationMs), status, appVersion)
  }
}
