import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactRelationship } from '../../../domain/entities/ArtifactRelationship'

export interface ArchitectureContextData {
  initiativeId: string
  requirements?: Artifact
  userStories?: Artifact
  implementationPlan?: Artifact
  existingArchitecture?: Artifact
  existingComponentDesigns: Artifact[]
  existingDeploymentArchitecture?: Artifact
  existingADRs: Artifact[]
  relatedEdges: ArtifactRelationship[]
}

export class BuildArchitectureContext {
  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService
  ) {}

  async build(initiativeId: string): Promise<ArchitectureContextData> {
    const artifacts = await this.artifactEngine.listArtifacts(initiativeId)

    const requirements = artifacts.find((a) => a.type === 'Requirements')
    const userStories = artifacts.find((a) => a.type === 'UserStories')
    const implementationPlan = artifacts.find((a) => a.type === 'ImplementationPlan')
    const existingArchitecture = artifacts.find(
      (a) => a.type === 'Architecture' || a.type === 'SystemArchitecture'
    )
    const existingComponentDesigns = artifacts.filter((a) => a.type === 'ComponentDesign')
    const existingDeploymentArchitecture = artifacts.find(
      (a) => a.type === 'DeploymentArchitecture'
    )
    const existingADRs = artifacts.filter((a) => a.type === 'ADR')

    let relatedEdges: ArtifactRelationship[] = []
    if (existingArchitecture) {
      relatedEdges = await this.graphService.getRelationshipsBySource(existingArchitecture.id)
    }

    return {
      initiativeId,
      requirements,
      userStories,
      implementationPlan,
      existingArchitecture,
      existingComponentDesigns,
      existingDeploymentArchitecture,
      existingADRs,
      relatedEdges
    }
  }

  formatForPrompt(ctx: ArchitectureContextData): string {
    let prompt = `=== Architecture Context for Initiative ${ctx.initiativeId} ===\n\n`

    if (ctx.requirements?.content) {
      prompt += `--- Requirements ---\n${ctx.requirements.content}\n\n`
    }

    if (ctx.implementationPlan?.content) {
      prompt += `--- Implementation Plan ---\n${ctx.implementationPlan.content}\n\n`
    }

    if (ctx.existingArchitecture?.content) {
      prompt += `--- Existing System Architecture ---\n${ctx.existingArchitecture.content}\n\n`
    }

    if (ctx.existingADRs.length > 0) {
      prompt += `--- Existing ADRs ---\n`
      for (const adr of ctx.existingADRs) {
        prompt += `ADR (${adr.title}):\n${adr.content}\n\n`
      }
    }

    return prompt
  }
}
