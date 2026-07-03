import { IArtifactRepository } from '../../infrastructure/database/repositories/ArtifactRepository'
import { IInitiativeRepository } from '../../domain/repositories/IInitiativeRepository'
import { DomainEventBus } from '../../domain/events/DomainEventBus'
import {
  DomainEventType,
  ArtifactApprovedEvent,
  ArtifactEditedEvent
} from '../../domain/events/DomainEvent'

export class WorkflowEngine {
  constructor(
    private readonly artifactRepository: IArtifactRepository,
    private readonly initiativeRepository: IInitiativeRepository,
    eventBus: DomainEventBus
  ) {
    eventBus.subscribe<ArtifactApprovedEvent>(DomainEventType.ArtifactApproved, async (event) => {
      await this.onArtifactApproved(event.aggregateId, event.initiativeId)
    })

    eventBus.subscribe<ArtifactEditedEvent>(DomainEventType.ArtifactEdited, async (event) => {
      await this.onArtifactEdited(event.aggregateId, event.initiativeId)
    })
  }

  // 2. Cascade NeedsReview
  // If an Approved artifact is edited, downstream Approved artifacts become NeedsReview
  private async onArtifactEdited(editedArtifactId: string, initiativeId: string): Promise<void> {
    const artifacts = await this.artifactRepository.listByInitiative(initiativeId)
    const sequence = ['Vision', 'Requirements', 'Architecture', 'SystemDesign']

    const editedArtifact = artifacts.find((a) => a.id === editedArtifactId)
    if (!editedArtifact) return

    if (editedArtifact.status !== 'Approved') return

    const idx = sequence.indexOf(editedArtifact.type)
    if (idx === -1) return

    // Find all downstream artifacts that are currently Approved
    for (let i = idx + 1; i < sequence.length; i++) {
      const downstreamType = sequence[i]
      const downstreamArtifact = artifacts.find((a) => a.type === downstreamType)

      if (downstreamArtifact && downstreamArtifact.status === 'Approved') {
        await this.artifactRepository.updateStatus(downstreamArtifact.id, 'NeedsReview')
        // We could also emit a domain event or IPC notification here
      }
    }

    // Also update Initiative status if needed
    await this.updateInitiativeStatus(initiativeId)
  }

  private async onArtifactApproved(
    _approvedArtifactId: string,
    initiativeId: string
  ): Promise<void> {
    await this.updateInitiativeStatus(initiativeId)
  }

  private async updateInitiativeStatus(initiativeId: string): Promise<void> {
    const artifacts = await this.artifactRepository.listByInitiative(initiativeId)
    const hasApproved = artifacts.some((a) => a.status === 'Approved')

    const currentInitiative = await this.initiativeRepository.findById(initiativeId)
    if (!currentInitiative) return

    let newStatus: 'Discovery' | 'InProgress' | 'Released' | 'Archived' = currentInitiative.status

    if (hasApproved && currentInitiative.status === 'Discovery') {
      newStatus = 'InProgress'
    } else if (!hasApproved && currentInitiative.status === 'InProgress') {
      newStatus = 'Discovery'
    }

    if (newStatus !== currentInitiative.status) {
      await this.initiativeRepository.updateStatus(initiativeId, newStatus)
    }
  }
}
