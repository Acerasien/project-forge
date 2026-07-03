export type ArtifactType =
  | 'Vision'
  | 'Requirements'
  | 'Architecture'
  | 'SystemDesign' // Deprecated, use architecture components
  | 'SystemArchitecture'
  | 'ComponentDesign'
  | 'DeploymentArchitecture'
  | 'UserStories'
  | 'ImplementationPlan'
  | 'ADR'
  | 'Task'
  | 'AISession'

export type ArtifactStatus = 'Draft' | 'Approved' | 'NeedsReview'

export class Artifact {
  constructor(
    public readonly id: string,
    public readonly initiativeId: string,
    public type: ArtifactType,
    public title: string,
    public content: string | null,
    public status: ArtifactStatus,
    public version: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public generatedByCapabilityId?: string,
    public generatedByCapabilityVersion?: string,
    public generatedWorkflowId?: string,
    public generationSessionId?: string,
    public generatedAt?: Date
  ) {}
}
