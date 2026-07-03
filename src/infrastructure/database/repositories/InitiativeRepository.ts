import { IInitiativeRepository } from '../../../domain/repositories/IInitiativeRepository'
import { Initiative } from '../../../domain/entities/Initiative'
import { KyselyAdapter } from '../KyselyAdapter'

export class InitiativeRepository implements IInitiativeRepository {
  constructor(private adapter: KyselyAdapter) {}

  public async findById(id: string): Promise<Initiative | null> {
    const row = await this.adapter
      .getKysely()
      .selectFrom('initiatives')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) return null

    // Hydrate back to the domain model
    return new Initiative(
      row.id,
      row.name,
      row.description,
      row.status as 'Discovery' | 'InProgress' | 'Released' | 'Archived',
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    )
  }

  public async list(): Promise<Initiative[]> {
    const rows = await this.adapter
      .getKysely()
      .selectFrom('initiatives')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute()

    return rows.map(
      (row) =>
        new Initiative(
          row.id,
          row.name,
          row.description,
          row.status as 'Discovery' | 'InProgress' | 'Released' | 'Archived',
          new Date(row.created_at as string),
          new Date(row.updated_at as string)
        )
    )
  }

  public async save(initiative: Initiative): Promise<void> {
    const db = this.adapter.getKysely()

    // SQLite UPSERT pattern via Kysely
    await db
      .insertInto('initiatives')
      .values({
        id: initiative.id,
        name: initiative.name,
        description: initiative.description,
        status: initiative.status,
        created_at: initiative.createdAt.toISOString(),
        updated_at: initiative.updatedAt.toISOString()
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          name: initiative.name,
          description: initiative.description,
          status: initiative.status,
          updated_at: new Date().toISOString()
        })
      )
      .execute()
  }

  public async updateStatus(
    id: string,
    status: 'Discovery' | 'InProgress' | 'Released' | 'Archived'
  ): Promise<void> {
    await this.adapter
      .getKysely()
      .updateTable('initiatives')
      .set({
        status,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .execute()
  }

  public async delete(id: string): Promise<void> {
    await this.adapter.getKysely().deleteFrom('initiatives').where('id', '=', id).execute()
  }
}
