import { IInitiativeRepository } from '../../domain/repositories/IInitiativeRepository'
import { Initiative } from '../../domain/entities/Initiative'
import { ArtifactEngine } from './ArtifactEngine'
import { randomUUID } from 'crypto'

export class InitiativeService {
  constructor(
    private readonly repository: IInitiativeRepository,
    private readonly artifactEngine?: ArtifactEngine
  ) {}

  public async createInitiative(name: string, description?: string): Promise<Initiative> {
    const id = randomUUID()
    const initiative = new Initiative(
      id,
      name,
      description || null,
      'Discovery',
      new Date(),
      new Date()
    )
    await this.repository.save(initiative)

    // Scaffold core artifacts
    if (this.artifactEngine) {
      await this.artifactEngine.createArtifact(id, 'Vision', 'Vision')
      await this.artifactEngine.createArtifact(id, 'Requirements', 'Requirements')
      await this.artifactEngine.createArtifact(id, 'Architecture', 'Architecture')
      await this.artifactEngine.createArtifact(id, 'SystemDesign', 'System Design')
    }

    return initiative
  }

  public async getInitiative(id: string): Promise<Initiative | null> {
    return this.repository.findById(id)
  }

  public async listInitiatives(): Promise<Initiative[]> {
    return this.repository.list()
  }

  public async renameInitiative(id: string, newName: string): Promise<Initiative> {
    const initiative = await this.repository.findById(id)
    if (!initiative) {
      throw new Error(`Initiative ${id} not found`)
    }

    initiative.name = newName
    await this.repository.save(initiative)

    return initiative
  }

  public async deleteInitiative(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
