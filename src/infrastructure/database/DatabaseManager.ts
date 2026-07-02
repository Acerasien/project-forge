import Database from 'better-sqlite3'

export class DatabaseManager {
  private db: Database.Database | null = null
  private readonly dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  public initialize(): void {
    if (this.db) return

    try {
      this.db = new Database(this.dbPath)

      // ADR-005: Use WAL mode for better concurrency and performance
      try {
        this.db.pragma('journal_mode = WAL')
      } catch (e) {
        console.warn(
          `[DatabaseManager] Failed to enable WAL mode (this is expected in some :memory: environments):`,
          e
        )
      }

      // ADR-007 (Implicit): Enforce foreign keys
      this.db.pragma('foreign_keys = ON')
    } catch (error) {
      console.error(`[DatabaseManager] Failed to connect to database at ${this.dbPath}:`, error)
      throw error
    }
  }

  public getConnection(): Database.Database {
    if (!this.db) {
      throw new Error('[DatabaseManager] Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  public close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
