import { Initiative } from '../entities/Initiative'

export interface IInitiativeRepository {
  findById(id: string): Promise<Initiative | null>
  list(): Promise<Initiative[]>
  save(initiative: Initiative): Promise<void>
  delete(id: string): Promise<void>
}
