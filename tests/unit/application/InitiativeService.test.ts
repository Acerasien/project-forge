import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InitiativeService } from '@application/services/InitiativeService'
import { IInitiativeRepository } from '@domain/repositories/IInitiativeRepository'
import { Initiative } from '@domain/entities/Initiative'

describe('InitiativeService', () => {
  let mockRepo: IInitiativeRepository
  let service: InitiativeService

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn()
    }
    service = new InitiativeService(mockRepo)
  })

  it('should create a new initiative and save it', async () => {
    const init = await service.createInitiative('New Project')

    expect(init.name).toBe('New Project')
    expect(init.id).toBeDefined() // UUID generated
    expect(mockRepo.save).toHaveBeenCalledWith(init)
  })

  it('should retrieve an initiative by id', async () => {
    const mockInit = new Initiative('123', 'Test', new Date())
    vi.mocked(mockRepo.findById).mockResolvedValue(mockInit)

    const result = await service.getInitiative('123')
    expect(result).toBe(mockInit)
    expect(mockRepo.findById).toHaveBeenCalledWith('123')
  })

  it('should throw an error if renaming a non-existent initiative', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null)

    await expect(service.renameInitiative('999', 'New Name')).rejects.toThrow(
      'Initiative 999 not found'
    )
  })

  it('should rename an existing initiative', async () => {
    const mockInit = new Initiative('123', 'Old Name', new Date())
    vi.mocked(mockRepo.findById).mockResolvedValue(mockInit)

    const result = await service.renameInitiative('123', 'New Name')

    expect(result.name).toBe('New Name')
    expect(mockRepo.save).toHaveBeenCalledWith(mockInit)
  })

  it('should delete an initiative', async () => {
    await service.deleteInitiative('123')
    expect(mockRepo.delete).toHaveBeenCalledWith('123')
  })
})
