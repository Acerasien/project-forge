import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InitiativeIpcHandler } from '@main/ipc/InitiativeIpcHandler'
import { InitiativeService } from '@application/services/InitiativeService'
import { IInitiativeRepository } from '@domain/repositories/IInitiativeRepository'
import { ipcMain } from 'electron'

// Mock electron ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}))

describe('InitiativeIpcHandler', () => {
  let mockRepo: IInitiativeRepository
  let service: InitiativeService
  let handler: InitiativeIpcHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn()
    }
    service = new InitiativeService(mockRepo)
    handler = new InitiativeIpcHandler(service)
  })

  it('should register handlers for all initiative channels', () => {
    handler.register()
    expect(ipcMain.handle).toHaveBeenCalledWith('initiatives:create', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('initiatives:get', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('initiatives:rename', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('initiatives:delete', expect.any(Function))
  })
})
