// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseManager } from '@infrastructure/database/DatabaseManager'
import { MigrationEngine } from '@infrastructure/database/MigrationEngine'
import { KyselyAdapter } from '@infrastructure/database/KyselyAdapter'

describe('KyselyAdapter', () => {
  let dbManager: DatabaseManager
  let kyselyAdapter: KyselyAdapter

  beforeEach(() => {
    dbManager = new DatabaseManager(':memory:')
    dbManager.initialize()

    // Migrate the basic schema for testing
    const migrationEngine = new MigrationEngine(dbManager.getConnection())
    migrationEngine.applyMigrations([
      {
        version: 1,
        name: 'init_initiatives',
        up: `
          CREATE TABLE initiatives (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ])

    kyselyAdapter = new KyselyAdapter(dbManager.getConnection())
  })

  afterEach(() => {
    dbManager.close()
  })

  it('should allow type-safe insert and select', async () => {
    const db = kyselyAdapter.getKysely()

    // Insert
    const insertResult = await db
      .insertInto('initiatives')
      .values({
        id: 'init-1',
        name: 'Alpha Project'
      })
      .executeTakeFirst()

    expect(insertResult.numInsertedOrUpdatedRows).toBe(1n)

    // Select
    const row = await db
      .selectFrom('initiatives')
      .selectAll()
      .where('id', '=', 'init-1')
      .executeTakeFirst()

    expect(row).toBeDefined()
    expect(row?.name).toBe('Alpha Project')
    expect(row?.created_at).toBeDefined()
  })

  it('should allow type-safe update and delete', async () => {
    const db = kyselyAdapter.getKysely()

    await db
      .insertInto('initiatives')
      .values({
        id: 'init-2',
        name: 'Beta Project'
      })
      .executeTakeFirst()

    // Update
    await db
      .updateTable('initiatives')
      .set({ name: 'Beta Project v2' })
      .where('id', '=', 'init-2')
      .execute()

    let row = await db
      .selectFrom('initiatives')
      .where('id', '=', 'init-2')
      .selectAll()
      .executeTakeFirst()
    expect(row?.name).toBe('Beta Project v2')

    // Delete
    await db.deleteFrom('initiatives').where('id', '=', 'init-2').execute()
    row = await db
      .selectFrom('initiatives')
      .where('id', '=', 'init-2')
      .selectAll()
      .executeTakeFirst()
    expect(row).toBeUndefined()
  })
})
