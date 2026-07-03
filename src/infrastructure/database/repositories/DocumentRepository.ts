import { KyselyAdapter } from '../KyselyAdapter'
import { Document } from '../../../domain/entities/Document'
import { DocumentTable } from '../schema'

export interface IDocumentRepository {
  create(document: Document): Promise<void>
  getById(id: string): Promise<Document | null>
  listByInitiative(initiativeId: string): Promise<Document[]>
  updateContent(id: string, content: string): Promise<void>
  delete(id: string): Promise<void>
}

export class DocumentRepository implements IDocumentRepository {
  constructor(private db: KyselyAdapter) {}

  private mapToDomain(row: DocumentTable): Document {
    return new Document(
      row.id,
      row.initiative_id,
      row.name,
      row.extension,
      row.content,
      row.preferred_tool_id,
      new Date(row.created_at as unknown as string),
      new Date(row.updated_at as unknown as string)
    )
  }

  async create(document: Document): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .insertInto('documents')
      .values({
        id: document.id,
        initiative_id: document.initiativeId,
        name: document.name,
        extension: document.extension,
        content: document.content,
        preferred_tool_id: document.preferredToolId
      })
      .execute()
  }

  async getById(id: string): Promise<Document | null> {
    const kysely = this.db.getKysely()
    const row = await kysely
      .selectFrom('documents')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? this.mapToDomain(row as unknown as DocumentTable) : null
  }

  async listByInitiative(initiativeId: string): Promise<Document[]> {
    const kysely = this.db.getKysely()
    const rows = await kysely
      .selectFrom('documents')
      .selectAll()
      .where('initiative_id', '=', initiativeId)
      .orderBy('name', 'asc')
      .execute()
    return rows.map((row) => this.mapToDomain(row as unknown as DocumentTable))
  }

  async updateContent(id: string, content: string): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .updateTable('documents')
      .set({
        content,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .execute()
  }

  async delete(id: string): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely.deleteFrom('documents').where('id', '=', id).execute()
  }
}
