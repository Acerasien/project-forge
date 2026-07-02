// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseManager } from '@infrastructure/database/DatabaseManager'
import { MigrationEngine } from '@infrastructure/database/MigrationEngine'
import { KyselyAdapter } from '@infrastructure/database/KyselyAdapter'
import { InitiativeRepository } from '@infrastructure/database/repositories/InitiativeRepository'
import { Initiative } from '@domain/entities/Initiative'

describe('InitiativeRepository', () => {
  let dbManager: DatabaseManager
  let kyselyAdapter: KyselyAdapter
  let repository: InitiativeRepository

  beforeEach(() => {
    dbManager = new DatabaseManager(':memory:')
    dbManager.initialize()

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
    repository = new InitiativeRepository(kyselyAdapter)
  })

  afterEach(() => {
    dbManager.close()
  })

  it('should save and retrieve an initiative', async () => {
    const initiative = new Initiative('init-1', 'Project Alpha', new Date())
    await repository.save(initiative)

    const retrieved = await repository.findById('init-1')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.id).toBe('init-1')
    expect(retrieved?.name).toBe('Project Alpha')
    expect(retrieved?.createdAt).toBeInstanceOf(Date)
  })

  it('should update an existing initiative', async () => {
    const initiative = new Initiative('init-2', 'Project Beta', new Date())
    await repository.save(initiative)

    initiative.name = 'Project Beta V2'
    await repository.save(initiative)

    const retrieved = await repository.findById('init-2')
    expect(retrieved?.name).toBe('Project Beta V2')
  })

  it('should delete an initiative', async () => {
    const initiative = new Initiative('init-3', 'Project Gamma', new Date())
    await repository.save(initiative)

    await repository.delete('init-3')
    const retrieved = await repository.findById('init-3')
    expect(retrieved).toBeNull()
  })
})
