import { ipcMain, dialog } from 'electron'
import { SettingsManager } from '../../application/services/SettingsManager'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'
import { AIProfile, AppSettings } from '../../shared/types/settings'
import { AIProviderFactory } from '../../infrastructure/ai/AIProviderFactory'
import { Result } from '../../shared/types/ipc'

export class SettingsIpcHandler {
  constructor(
    private readonly settingsManager: SettingsManager,
    private readonly runtime: WorkspaceRuntime
  ) {}

  register(): void {
    ipcMain.handle('settings:get', async (): Promise<Result<AppSettings>> => {
      try {
        return { success: true, data: this.settingsManager.getClientSettings() }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: { code: 'SETTINGS_GET_ERR', message: msg } }
      }
    })

    ipcMain.handle(
      'settings:update',
      async (_, updates: Partial<Omit<AppSettings, 'version'>>): Promise<Result<void>> => {
        try {
          this.settingsManager.updateSettings(updates)
          // If the active profile changed and we are running, reload provider
          if (updates.activeProfileId !== undefined && this.runtime.isActive()) {
            const activeProfile = this.settingsManager.getActiveProfile()
            await this.runtime.switchWorkspace(this.runtime.getWorkspacePath()!, activeProfile)
          }
          return { success: true, data: undefined }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          return { success: false, error: { code: 'SETTINGS_UPDATE_ERR', message: msg } }
        }
      }
    )

    ipcMain.handle('settings:saveProfile', async (_, profile: AIProfile): Promise<Result<void>> => {
      try {
        this.settingsManager.saveProfile(profile)
        // If this is the active profile and we are running, reload provider
        const activeProfile = this.settingsManager.getActiveProfile()
        if (activeProfile && activeProfile.id === profile.id && this.runtime.isActive()) {
          await this.runtime.switchWorkspace(this.runtime.getWorkspacePath()!, activeProfile)
        }
        return { success: true, data: undefined }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          success: false,
          error: { code: 'SETTINGS_SAVE_PROFILE_ERR', message: msg }
        }
      }
    })

    ipcMain.handle('settings:deleteProfile', async (_, id: string): Promise<Result<void>> => {
      try {
        this.settingsManager.deleteProfile(id)
        if (this.runtime.isActive()) {
          const activeProfile = this.settingsManager.getActiveProfile()
          await this.runtime.switchWorkspace(this.runtime.getWorkspacePath()!, activeProfile)
        }
        return { success: true, data: undefined }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          success: false,
          error: { code: 'SETTINGS_DELETE_PROFILE_ERR', message: msg }
        }
      }
    })

    ipcMain.handle('settings:selectWorkspace', async (): Promise<Result<string | null>> => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Forge Workspace Directory'
        })
        if (result.canceled || result.filePaths.length === 0) {
          return { success: true, data: null }
        }
        return { success: true, data: result.filePaths[0] }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: { code: 'WORKSPACE_SELECT_ERR', message: msg } }
      }
    })

    ipcMain.handle(
      'settings:initializeWorkspace',
      async (_, workspacePath: string, activeProfile: AIProfile | null): Promise<Result<void>> => {
        try {
          this.settingsManager.updateSettings({ workspacePath })
          await this.runtime.initialize(workspacePath, activeProfile)
          return { success: true, data: undefined }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          return { success: false, error: { code: 'WORKSPACE_INIT_ERR', message: msg } }
        }
      }
    )

    ipcMain.handle(
      'settings:testConnection',
      async (
        _,
        profile: AIProfile
      ): Promise<Result<{ success: boolean; latencyMs: number; error?: string }>> => {
        try {
          const provider = AIProviderFactory.create(profile)
          const result = await provider.testConnection()
          return { success: true, data: result }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          return {
            success: true,
            data: {
              success: false,
              latencyMs: 0,
              error: msg
            }
          }
        }
      }
    )

    ipcMain.handle(
      'settings:fetchModels',
      async (_, profile: AIProfile): Promise<Result<string[]>> => {
        try {
          const provider = AIProviderFactory.create(profile)
          const models = await provider.fetchAvailableModels()
          return { success: true, data: models }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          return { success: false, error: { code: 'FETCH_MODELS_ERR', message: msg } }
        }
      }
    )
  }
}
