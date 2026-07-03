import { Artifact, ArtifactStatus, ArtifactType } from '../../domain/entities/Artifact'
import { IArtifactRepository } from '../../infrastructure/database/repositories/ArtifactRepository'
import { randomUUID } from 'crypto'
import { DomainEventBus } from '../../domain/events/DomainEventBus'
import { ArtifactApprovedEvent, ArtifactEditedEvent } from '../../domain/events/DomainEvent'

export class ArtifactEngine {
  constructor(
    private readonly repository: IArtifactRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  async createArtifact(
    initiativeId: string,
    type: ArtifactType,
    title: string,
    provenance?: {
      generatedByCapabilityId?: string
      generatedByCapabilityVersion?: string
      generatedWorkflowId?: string
      generationSessionId?: string
    }
  ): Promise<Artifact> {
    const artifact = new Artifact(
      randomUUID(),
      initiativeId,
      type,
      title,
      null,
      'Draft',
      1,
      new Date(),
      new Date(),
      provenance?.generatedByCapabilityId,
      provenance?.generatedByCapabilityVersion,
      provenance?.generatedWorkflowId,
      provenance?.generationSessionId,
      provenance ? new Date() : undefined
    )

    await this.repository.create(artifact)
    return artifact
  }

  async getArtifact(id: string): Promise<Artifact | null> {
    return this.repository.getById(id)
  }

  async listArtifacts(initiativeId: string): Promise<Artifact[]> {
    return this.repository.listByInitiative(initiativeId)
  }

  async updateContent(id: string, content: string): Promise<void> {
    const artifact = await this.repository.getById(id)
    if (!artifact) throw new Error(`Artifact not found: ${id}`)

    artifact.content = content
    artifact.version += 1

    await this.repository.update(artifact)

    this.eventBus.publish(new ArtifactEditedEvent(artifact.id, artifact.initiativeId))
  }

  async updateStatus(id: string, newStatus: ArtifactStatus, bypassGates = false): Promise<void> {
    const artifact = await this.repository.getById(id)
    if (!artifact) throw new Error(`Artifact not found: ${id}`)

    if (newStatus === 'Approved' && !bypassGates) {
      const warning = await this.checkApprovalGate(artifact)
      if (warning) {
        throw new Error(`GateWarning: ${warning}`) // Alternatively, return a structured warning to be handled by IPC
      }
    }

    await this.repository.updateStatus(id, newStatus)

    if (newStatus === 'Approved') {
      this.eventBus.publish(new ArtifactApprovedEvent(artifact.id, artifact.initiativeId))
    }
  }

  private async checkApprovalGate(artifact: Artifact): Promise<string | null> {
    const sequence = ['Vision', 'Requirements', 'Architecture', 'SystemDesign']
    const idx = sequence.indexOf(artifact.type)

    if (idx <= 0) return null // Vision has no upstream, or type is outside core sequence (e.g., UserStories)

    const upstreamType = sequence[idx - 1]

    // Find upstream artifact in the same initiative
    const artifacts = await this.repository.listByInitiative(artifact.initiativeId)
    const upstreamArtifact = artifacts.find((a) => a.type === upstreamType)

    if (!upstreamArtifact) {
      return `Upstream artifact ${upstreamType} is missing.`
    }

    if (upstreamArtifact.status !== 'Approved') {
      return `Upstream artifact ${upstreamType} must be Approved before approving ${artifact.type}. Current status: ${upstreamArtifact.status}.`
    }

    return null // No warning
  }
}
