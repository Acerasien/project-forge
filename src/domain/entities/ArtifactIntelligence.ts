export class ArtifactIntelligence {
  constructor(
    public readonly id: string,
    public readonly artifactId: string,
    public completenessScore: number | null,
    public aiConfidence: number | null,
    public critiqueSummary: string | null,
    public detectedRisks: string | null,
    public assumptions: string | null,
    public suggestedImprovements: string | null,
    public validationModel: string | null,
    public isStale: boolean,
    public lastValidatedAt: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}
}
