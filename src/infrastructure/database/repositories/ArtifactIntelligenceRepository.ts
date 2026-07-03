import { KyselyAdapter } from '../KyselyAdapter'
import { ArtifactIntelligence } from '../../../domain/entities/ArtifactIntelligence'

export interface IArtifactIntelligenceRepository {
  getLatestByArtifactId(artifactId: string): Promise<ArtifactIntelligence | null>
  save(intelligence: ArtifactIntelligence): Promise<void>
  markStale(artifactId: string): Promise<void>
}

export class ArtifactIntelligenceRepository implements IArtifactIntelligenceRepository {
  constructor(private readonly db: KyselyAdapter) {}

  private mapToEntity(row: any): ArtifactIntelligence {
    return new ArtifactIntelligence(
      row.id,
      row.artifact_id,
      row.completeness_score,
      row.ai_confidence,
      row.critique_summary,
      row.detected_risks,
      row.assumptions,
      row.suggested_improvements,
      row.validation_model,
      Boolean(row.is_stale),
      row.last_validated_at ? new Date(row.last_validated_at) : null,
      new Date(row.created_at),
      new Date(row.updated_at)
    )
  }

  async getLatestByArtifactId(artifactId: string): Promise<ArtifactIntelligence | null> {
    const kysely = this.db.getKysely()
    const row = await kysely
      .selectFrom('artifact_intelligence')
      .selectAll()
      .where('artifact_id', '=', artifactId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    return row ? this.mapToEntity(row) : null
  }

  async save(intelligence: ArtifactIntelligence): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .insertInto('artifact_intelligence')
      .values({
        id: intelligence.id,
        artifact_id: intelligence.artifactId,
        completeness_score: intelligence.completenessScore,
        ai_confidence: intelligence.aiConfidence,
        critique_summary: intelligence.critiqueSummary,
        detected_risks: intelligence.detectedRisks,
        assumptions: intelligence.assumptions,
        suggested_improvements: intelligence.suggestedImprovements,
        validation_model: intelligence.validationModel,
        is_stale: intelligence.isStale ? 1 : 0,
        last_validated_at: intelligence.lastValidatedAt?.toISOString() || null,
        created_at: intelligence.createdAt.toISOString(),
        updated_at: intelligence.updatedAt.toISOString()
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          completeness_score: intelligence.completenessScore,
          ai_confidence: intelligence.aiConfidence,
          critique_summary: intelligence.critiqueSummary,
          detected_risks: intelligence.detectedRisks,
          assumptions: intelligence.assumptions,
          suggested_improvements: intelligence.suggestedImprovements,
          validation_model: intelligence.validationModel,
          is_stale: intelligence.isStale ? 1 : 0,
          last_validated_at: intelligence.lastValidatedAt?.toISOString() || null,
          updated_at: intelligence.updatedAt.toISOString()
        })
      )
      .execute()
  }

  async markStale(artifactId: string): Promise<void> {
    const kysely = this.db.getKysely()
    await kysely
      .updateTable('artifact_intelligence')
      .set({ is_stale: 1, updated_at: new Date().toISOString() })
      .where('artifact_id', '=', artifactId)
      .execute()
  }
}
