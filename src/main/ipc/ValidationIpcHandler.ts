import { ipcMain } from 'electron'
import { ValidationService } from '../../application/services/ValidationService'

export class ValidationIpcHandler {
  constructor(private readonly validationService: ValidationService) {}

  public register(): void {
    ipcMain.handle('validation:reviewArtifact', async (_, artifactId: string) => {
      try {
        const intelligence = await this.validationService.reviewArtifact(artifactId)
        return { success: true, data: intelligence }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('validation:getLatestIntelligence', async (_, artifactId: string) => {
      try {
        const intelligence = await this.validationService.getLatestIntelligence(artifactId)
        return { success: true, data: intelligence }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })
  }
}
