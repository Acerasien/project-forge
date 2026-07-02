// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseManager } from '@infrastructure/database/DatabaseManager'
import { MigrationEngine } from '@infrastructure/database/MigrationEngine'

describe('MigrationEngine', () => {
  let dbManager: DatabaseManager

  beforeEach(() => {
    dbManager = new DatabaseManager(':memory:')
    dbManager.initialize()
  })

  afterEach(() => {
    dbManager.close()
  })

  it('should initialize the migrations table if it does not exist', () => {
    const engine = new MigrationEngine(dbManager.getConnection())
    engine.setup()

    const tableExists = dbManager
      .getConnection()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_forge_migrations'")
      .get()

    expect(tableExists).toBeDefined()
  })

  it('should execute pending migrations in order', () => {
    const engine = new MigrationEngine(dbManager.getConnection())

    const mockMigrations = [
      { version: 1, name: '001-init', up: 'CREATE TABLE users (id INTEGER PRIMARY KEY);' },
      { version: 2, name: '002-add-name', up: 'ALTER TABLE users ADD COLUMN name TEXT;' }
    ]

    engine.applyMigrations(mockMigrations)

    // Verify migrations were applied
    const tableExists = dbManager
      .getConnection()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get()
    expect(tableExists).toBeDefined()

    // Verify version tracking
    const applied = engine.getAppliedMigrations()
    expect(applied.length).toBe(2)
    expect(applied[0].version).toBe(1)
    expect(applied[1].version).toBe(2)
  })

  it('should not re-apply already executed migrations', () => {
    const engine = new MigrationEngine(dbManager.getConnection())

    const mockMigrations = [
      { version: 1, name: '001-init', up: 'CREATE TABLE items (id INTEGER PRIMARY KEY);' }
    ]

    engine.applyMigrations(mockMigrations)
    expect(engine.getAppliedMigrations().length).toBe(1)

    // Calling it again should be a no-op (won't throw table exists error)
    engine.applyMigrations(mockMigrations)
    expect(engine.getAppliedMigrations().length).toBe(1)
  })

  it('should throw an error if a previously applied migration checksum changes', () => {
    const engine = new MigrationEngine(dbManager.getConnection())

    const mockMigrations1 = [
      { version: 1, name: '001-init', up: 'CREATE TABLE items (id INTEGER PRIMARY KEY);' }
    ]
    engine.applyMigrations(mockMigrations1)

    // Modify the previously applied migration
    const mockMigrations2 = [
      {
        version: 1,
        name: '001-init',
        up: 'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT);'
      }
    ]

    expect(() => engine.applyMigrations(mockMigrations2)).toThrowError(/checksum mismatch/i)
  })

  it('should execute new migrations and track status on upgrade', () => {
    const engine = new MigrationEngine(dbManager.getConnection())

    const mockMigrations1 = [
      { version: 1, name: '001-init', up: 'CREATE TABLE items (id INTEGER PRIMARY KEY);' }
    ]
    engine.applyMigrations(mockMigrations1)

    const applied1 = engine.getAppliedMigrations()
    expect(applied1[0].status).toBe('success')
    expect(applied1[0].checksum).toBeDefined()

    const mockMigrations2 = [
      ...mockMigrations1,
      { version: 2, name: '002-upgrade', up: 'ALTER TABLE items ADD COLUMN desc TEXT;' }
    ]
    engine.applyMigrations(mockMigrations2)

    const applied2 = engine.getAppliedMigrations()
    expect(applied2.length).toBe(2)
    expect(applied2[1].status).toBe('success')
    expect(applied2[1].checksum).toBeDefined()
  })
})
