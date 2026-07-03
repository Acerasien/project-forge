import { ipcMain } from 'electron'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'

export class ValidationIpcHandler {
  constructor(private readonly runtime: WorkspaceRuntime) {}

  public register(): void {
    ipcMain.handle('validation:reviewArtifact', async (_, artifactId: string) => {
      try {
        const service = this.runtime.getValidationService()
        const intelligence = await service.reviewArtifact(artifactId)
        return { success: true, data: intelligence }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('validation:getLatestIntelligence', async (_, artifactId: string) => {
      try {
        const service = this.runtime.getValidationService()
        const intelligence = await service.getLatestIntelligence(artifactId)
        return { success: true, data: intelligence }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })
  }
}
