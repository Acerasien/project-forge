import { KyselyAdapter } from '../KyselyAdapter'
import {
  ArtifactRelationship,
  RelationshipType
} from '../../../domain/entities/ArtifactRelationship'
import { ArtifactRelationshipTable } from '../schema'

export interface IGraphRepository {
  createRelationship(relationship: ArtifactRelationship): Promise<void>
  deleteRelationship(id: string): Promise<void>
  getRelationshipsBySource(sourceId: string): Promise<ArtifactRelationship[]>
  getRelationshipsByTarget(targetId: string): Promise<ArtifactRelationship[]>
  getAllRelationshipsInInitiative(initiativeId: string): Promise<ArtifactRelationship[]>
}

export class GraphRepository implements IGraphRepository {
  constructor(private db: KyselyAdapter) {}

  private mapToDomain(row: ArtifactRelationshipTable): ArtifactRelationship {
    return new ArtifactRelationship(
      row.id,
      row.source_id,
      row.target_id,
      row.type as RelationshipType,
      new Date(row.created_at as unknown as string)
    )
  }

  async createRelationship(relationship: ArtifactRelationship): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .insertInto('artifact_relationships')
      .values({
        id: relationship.id,
        source_id: relationship.sourceId,
        target_id: relationship.targetId,
        type: relationship.type
      })
      .execute()
  }

  async deleteRelationship(id: string): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely.deleteFrom('artifact_relationships').where('id', '=', id).execute()
  }

  async getRelationshipsBySource(sourceId: string): Promise<ArtifactRelationship[]> {
    const kysely = this.db.getKysely()
    const rows = await kysely
      .selectFrom('artifact_relationships')
      .selectAll()
      .where('source_id', '=', sourceId)
      .execute()
    return rows.map((row) => this.mapToDomain(row as unknown as ArtifactRelationshipTable))
  }

  async getRelationshipsByTarget(targetId: string): Promise<ArtifactRelationship[]> {
    const kysely = this.db.getKysely()
    const rows = await kysely
      .selectFrom('artifact_relationships')
      .selectAll()
      .where('target_id', '=', targetId)
      .execute()
    return rows.map((row) => this.mapToDomain(row as unknown as ArtifactRelationshipTable))
  }

  async getAllRelationshipsInInitiative(initiativeId: string): Promise<ArtifactRelationship[]> {
    const kysely = this.db.getKysely()
    // Find all relationships where either the source or the target is an artifact in this initiative.
    // Assuming source or target is an artifact belonging to the initiative.
    const rows = await kysely
      .selectFrom('artifact_relationships')
      .innerJoin('artifacts', 'artifacts.id', 'artifact_relationships.source_id')
      .selectAll('artifact_relationships')
      .where('artifacts.initiative_id', '=', initiativeId)
      .execute()

    // Also might want to get relationships where target is in initiative but source is not, but typically they are in the same initiative.
    return rows.map((row) => this.mapToDomain(row as unknown as ArtifactRelationshipTable))
  }
}
