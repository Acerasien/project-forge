import { ArtifactIntelligence } from '../../domain/entities/ArtifactIntelligence'
import { IArtifactIntelligenceRepository } from '../../infrastructure/database/repositories/ArtifactIntelligenceRepository'
import { IArtifactRepository } from '../../infrastructure/database/repositories/ArtifactRepository'
import { ArtifactValidator } from './validators/ArtifactValidator'
import { DomainEventBus } from '../../domain/events/DomainEventBus'
import { DomainEventType, ArtifactEditedEvent } from '../../domain/events/DomainEvent'

export class ValidationService {
  constructor(
    private readonly artifactRepo: IArtifactRepository,
    private readonly intelligenceRepo: IArtifactIntelligenceRepository,
    private readonly primaryValidator: ArtifactValidator, // AI Validator for now
    eventBus: DomainEventBus
  ) {
    eventBus.subscribe<ArtifactEditedEvent>(DomainEventType.ArtifactEdited, async (event) => {
      await this.markStale(event.aggregateId)
    })
  }

  async markStale(artifactId: string): Promise<void> {
    await this.intelligenceRepo.markStale(artifactId)
  }

  async reviewArtifact(artifactId: string): Promise<ArtifactIntelligence> {
    const artifact = await this.artifactRepo.getById(artifactId)
    if (!artifact) throw new Error(`Artifact not found: ${artifactId}`)

    const intelligence = await this.primaryValidator.validate(artifact)
    await this.intelligenceRepo.save(intelligence)

    return intelligence
  }

  async getLatestIntelligence(artifactId: string): Promise<ArtifactIntelligence | null> {
    return this.intelligenceRepo.getLatestByArtifactId(artifactId)
  }

  async saveIntelligence(intelligence: ArtifactIntelligence): Promise<void> {
    await this.intelligenceRepo.save(intelligence)
  }
}
