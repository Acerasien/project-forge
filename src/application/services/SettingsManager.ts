import * as fs from 'fs'
import { AppSettings, AIProfile } from '../../shared/types/settings'

const CURRENT_SETTINGS_VERSION = 1

export class SettingsManager {
  private currentSettings: AppSettings

  constructor(private readonly settingsFilePath: string) {
    this.currentSettings = this.loadFromFile()
  }

  /**
   * Load settings from file or create defaults if it doesn't exist.
   */
  private loadFromFile(): AppSettings {
    const defaultSettings: AppSettings = {
      version: CURRENT_SETTINGS_VERSION,
      workspacePath: null,
      activeProfileId: null,
      profiles: []
    }

    try {
      if (!fs.existsSync(this.settingsFilePath)) {
        this.saveToFile(defaultSettings)
        return defaultSettings
      }

      const raw = fs.readFileSync(this.settingsFilePath, 'utf-8')
      const parsed = JSON.parse(raw) as AppSettings

      // Run migrations if needed
      return this.migrate(parsed)
    } catch (error) {
      console.error('Failed to read settings file, reverting to default:', error)
      return defaultSettings
    }
  }

  /**
   * Save current settings state to file.
   */
  private saveToFile(settings: AppSettings): void {
    try {
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to write settings file:', error)
    }
  }

  /**
   * Perform schema migrations.
   */
  private migrate(settings: AppSettings): AppSettings {
    if (!settings.version || settings.version < CURRENT_SETTINGS_VERSION) {
      // In the future, write migration steps here
      settings.version = CURRENT_SETTINGS_VERSION
      this.saveToFile(settings)
    }
    return settings
  }

  /**
   * Get raw settings (backend-only, includes unmasked keys).
   */
  getSettings(): AppSettings {
    return { ...this.currentSettings }
  }

  /**
   * Get settings with masked API keys suitable for sending to the UI.
   */
  getClientSettings(): AppSettings {
    const maskedProfiles = this.currentSettings.profiles.map((p) => ({
      ...p,
      apiKey: p.apiKey ? this.maskKey(p.apiKey) : undefined
    }))

    return {
      ...this.currentSettings,
      profiles: maskedProfiles
    }
  }

  /**
   * Update full settings options.
   */
  updateSettings(updates: Partial<Omit<AppSettings, 'version'>>): void {
    this.currentSettings = {
      ...this.currentSettings,
      ...updates
    }
    this.saveToFile(this.currentSettings)
  }

  /**
   * Add or update a profile.
   */
  saveProfile(profile: AIProfile): void {
    const existingIndex = this.currentSettings.profiles.findIndex((p) => p.id === profile.id)

    // Handle key masking in updates
    const resolvedProfile = { ...profile }
    if (this.isMasked(profile.apiKey)) {
      const original = this.currentSettings.profiles[existingIndex]
      resolvedProfile.apiKey = original?.apiKey
    }

    if (existingIndex >= 0) {
      this.currentSettings.profiles[existingIndex] = resolvedProfile
    } else {
      this.currentSettings.profiles.push(resolvedProfile)
    }

    this.saveToFile(this.currentSettings)
  }

  /**
   * Delete an existing profile by ID.
   */
  deleteProfile(id: string): void {
    this.currentSettings.profiles = this.currentSettings.profiles.filter((p) => p.id !== id)
    if (this.currentSettings.activeProfileId === id) {
      this.currentSettings.activeProfileId = null
    }
    this.saveToFile(this.currentSettings)
  }

  /**
   * Retrieve the active profile, if any, with raw api credentials.
   */
  getActiveProfile(): AIProfile | null {
    if (!this.currentSettings.activeProfileId) return null
    return (
      this.currentSettings.profiles.find((p) => p.id === this.currentSettings.activeProfileId) ||
      null
    )
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return '••••••••'
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
  }

  private isMasked(key?: string): boolean {
    if (!key) return false
    return key.includes('••••')
  }
}
