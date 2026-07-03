import { ipcMain } from 'electron'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'
import { InitiativeDTO, Result } from '../../shared/types/ipc'

export class InitiativeIpcHandler {
  constructor(private readonly runtime: WorkspaceRuntime) {}

  private handleError(error: unknown): {
    success: false
    error: { code: string; message: string }
  } {
    console.error('[Initiative IPC Error]', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    let code = 'UNKNOWN_ERROR'
    if (message.includes('not found')) code = 'INITIATIVE_NOT_FOUND'
    if (message.includes('WORKSPACE_NOT_INITIALIZED')) code = 'WORKSPACE_NOT_INITIALIZED'

    return { success: false, error: { code, message } }
  }

  public register(): void {
    ipcMain.handle(
      'initiatives:create',
      async (_, name: string): Promise<Result<InitiativeDTO>> => {
        try {
          const service = this.runtime.getInitiativeService()
          const initiative = await service.createInitiative(name)
          return {
            success: true,
            data: {
              id: initiative.id,
              name: initiative.name,
              description: initiative.description,
              status: initiative.status,
              createdAt: initiative.createdAt.toISOString(),
              updatedAt: initiative.updatedAt.toISOString()
            }
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle(
      'initiatives:get',
      async (_, id: string): Promise<Result<InitiativeDTO | null>> => {
        try {
          const service = this.runtime.getInitiativeService()
          const initiative = await service.getInitiative(id)
          if (!initiative) {
            return { success: true, data: null }
          }
          return {
            success: true,
            data: {
              id: initiative.id,
              name: initiative.name,
              description: initiative.description,
              status: initiative.status,
              createdAt: initiative.createdAt.toISOString(),
              updatedAt: initiative.updatedAt.toISOString()
            }
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('initiatives:list', async (): Promise<Result<InitiativeDTO[]>> => {
      try {
        const service = this.runtime.getInitiativeService()
        const initiatives = await service.listInitiatives()
        return {
          success: true,
          data: initiatives.map((initiative) => ({
            id: initiative.id,
            name: initiative.name,
            description: initiative.description,
            status: initiative.status,
            createdAt: initiative.createdAt.toISOString(),
            updatedAt: initiative.updatedAt.toISOString()
          }))
        }
      } catch (error) {
        return this.handleError(error)
      }
    })

    ipcMain.handle(
      'initiatives:rename',
      async (_, id: string, newName: string): Promise<Result<InitiativeDTO>> => {
        try {
          const service = this.runtime.getInitiativeService()
          const initiative = await service.renameInitiative(id, newName)
          return {
            success: true,
            data: {
              id: initiative.id,
              name: initiative.name,
              description: initiative.description,
              status: initiative.status,
              createdAt: initiative.createdAt.toISOString(),
              updatedAt: initiative.updatedAt.toISOString()
            }
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('initiatives:delete', async (_, id: string): Promise<Result<void>> => {
      try {
        const service = this.runtime.getInitiativeService()
        await service.deleteInitiative(id)
        return { success: true, data: undefined }
      } catch (error) {
        return this.handleError(error)
      }
    })
  }
}
