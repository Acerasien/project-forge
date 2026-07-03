import { KyselyAdapter } from '../KyselyAdapter'
import { Artifact, ArtifactStatus, ArtifactType } from '../../../domain/entities/Artifact'
import { ArtifactTable } from '../schema'

export interface IArtifactRepository {
  create(artifact: Artifact): Promise<void>
  getById(id: string): Promise<Artifact | null>
  listByInitiative(initiativeId: string): Promise<Artifact[]>
  update(artifact: Artifact): Promise<void>
  updateStatus(id: string, status: ArtifactStatus): Promise<void>
}

export class ArtifactRepository implements IArtifactRepository {
  constructor(private db: KyselyAdapter) {}

  private mapToDomain(row: ArtifactTable): Artifact {
    return new Artifact(
      row.id,
      row.initiative_id,
      row.type as ArtifactType,
      row.title,
      row.content,
      row.status as ArtifactStatus,
      row.version,
      new Date(row.created_at as unknown as string),
      new Date(row.updated_at as unknown as string),
      row.generated_by_capability_id || undefined,
      row.generated_by_capability_version || undefined,
      row.generated_workflow_id || undefined,
      row.generation_session_id || undefined,
      row.generated_at ? new Date(row.generated_at as unknown as string) : undefined
    )
  }

  async create(artifact: Artifact): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .insertInto('artifacts')
      .values({
        id: artifact.id,
        initiative_id: artifact.initiativeId,
        type: artifact.type,
        title: artifact.title,
        content: artifact.content,
        status: artifact.status,
        version: artifact.version,
        generated_by_capability_id: artifact.generatedByCapabilityId || null,
        generated_by_capability_version: artifact.generatedByCapabilityVersion || null,
        generated_workflow_id: artifact.generatedWorkflowId || null,
        generation_session_id: artifact.generationSessionId || null,
        generated_at: artifact.generatedAt ? artifact.generatedAt.toISOString() : null
      })
      .execute()
  }

  async getById(id: string): Promise<Artifact | null> {
    const kysely = this.db.getKysely()
    const row = await kysely
      .selectFrom('artifacts')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? this.mapToDomain(row as unknown as ArtifactTable) : null
  }

  async listByInitiative(initiativeId: string): Promise<Artifact[]> {
    const kysely = this.db.getKysely()
    const rows = await kysely
      .selectFrom('artifacts')
      .selectAll()
      .where('initiative_id', '=', initiativeId)
      .orderBy('type', 'asc') // Could be ordered by sequence
      .execute()
    return rows.map((row) => this.mapToDomain(row as unknown as ArtifactTable))
  }

  async update(artifact: Artifact): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .updateTable('artifacts')
      .set({
        title: artifact.title,
        content: artifact.content,
        status: artifact.status,
        version: artifact.version,
        updated_at: new Date().toISOString(),
        generated_by_capability_id: artifact.generatedByCapabilityId || null,
        generated_by_capability_version: artifact.generatedByCapabilityVersion || null,
        generated_workflow_id: artifact.generatedWorkflowId || null,
        generation_session_id: artifact.generationSessionId || null,
        generated_at: artifact.generatedAt ? artifact.generatedAt.toISOString() : null
      })
      .where('id', '=', artifact.id)
      .execute()
  }

  async updateStatus(id: string, status: ArtifactStatus): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .updateTable('artifacts')
      .set({
        status,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .execute()
  }
}
