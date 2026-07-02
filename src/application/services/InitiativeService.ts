import { IInitiativeRepository } from '@domain/repositories/IInitiativeRepository'
import { Initiative } from '@domain/entities/Initiative'
import { randomUUID } from 'crypto'

export class InitiativeService {
  constructor(private readonly repository: IInitiativeRepository) {}

  public async createInitiative(name: string): Promise<Initiative> {
    const id = randomUUID()
    const initiative = new Initiative(id, name, new Date())
    await this.repository.save(initiative)
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
