import { ipcMain } from 'electron'
import { InitiativeService } from '@application/services/InitiativeService'
import { InitiativeDTO, Result } from '@shared/types/ipc'

export class InitiativeIpcHandler {
  constructor(private readonly initiativeService: InitiativeService) {}

  private handleError(error: unknown): {
    success: false
    error: { code: string; message: string }
  } {
    console.error('[IPC Error]', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    let code = 'UNKNOWN_ERROR'
    if (message.includes('not found')) code = 'INITIATIVE_NOT_FOUND'

    return { success: false, error: { code, message } }
  }

  public register(): void {
    ipcMain.handle(
      'initiatives:create',
      async (_, name: string): Promise<Result<InitiativeDTO>> => {
        try {
          const initiative = await this.initiativeService.createInitiative(name)
          return {
            success: true,
            data: {
              id: initiative.id,
              name: initiative.name,
              createdAt: initiative.createdAt.toISOString()
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
          const initiative = await this.initiativeService.getInitiative(id)
          if (!initiative) {
            return { success: true, data: null }
          }
          return {
            success: true,
            data: {
              id: initiative.id,
              name: initiative.name,
              createdAt: initiative.createdAt.toISOString()
            }
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('initiatives:list', async (): Promise<Result<InitiativeDTO[]>> => {
      try {
        const initiatives = await this.initiativeService.listInitiatives()
        return {
          success: true,
          data: initiatives.map((init) => ({
            id: init.id,
            name: init.name,
            createdAt: init.createdAt.toISOString()
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
          const initiative = await this.initiativeService.renameInitiative(id, newName)
          return {
            success: true,
            data: {
              id: initiative.id,
              name: initiative.name,
              createdAt: initiative.createdAt.toISOString()
            }
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('initiatives:delete', async (_, id: string): Promise<Result<void>> => {
      try {
        await this.initiativeService.deleteInitiative(id)
        return { success: true, data: undefined }
      } catch (error) {
        return this.handleError(error)
      }
    })
  }
}
