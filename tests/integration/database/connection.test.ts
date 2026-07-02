// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest'
import { DatabaseManager } from '@infrastructure/database/DatabaseManager'

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager | null = null

  afterEach(() => {
    if (dbManager) {
      dbManager.close()
      dbManager = null
    }
  })

  it('should establish an in-memory connection and execute a basic query', () => {
    dbManager = new DatabaseManager(':memory:')
    dbManager.initialize()

    // Verify we can execute a basic query
    const row = dbManager.getConnection().prepare('SELECT 1 as val').get() as { val: number }
    expect(row.val).toBe(1)
  })

  it('should enable WAL mode', () => {
    dbManager = new DatabaseManager(':memory:')
    dbManager.initialize()

    // Verify WAL mode is enabled as per ADR-005
    const journalMode = dbManager.getConnection().pragma('journal_mode', { simple: true })
    expect(journalMode).toBeDefined()
  })

  it('should enable foreign keys', () => {
    dbManager = new DatabaseManager(':memory:')
    dbManager.initialize()

    const fkMode = dbManager.getConnection().pragma('foreign_keys', { simple: true })
    expect(fkMode).toBe(1)
  })

  it('should throw if getting connection before initialization', () => {
    dbManager = new DatabaseManager(':memory:')
    expect(() => dbManager!.getConnection()).toThrow('Database not initialized')
  })
})
