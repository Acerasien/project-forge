import { create } from 'zustand'
import { AppSettings, AIProfile } from '../../../shared/types/settings'

interface SettingsState {
  workspacePath: string | null
  activeProfileId: string | null
  profiles: AIProfile[]
  isLoading: boolean

  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (updates: Partial<Omit<AppSettings, 'version'>>) => Promise<boolean>
  saveProfile: (profile: AIProfile) => Promise<boolean>
  deleteProfile: (id: string) => Promise<boolean>
  selectWorkspace: () => Promise<string | null>
  initializeWorkspace: (path: string, profile: AIProfile | null) => Promise<boolean>
  testConnection: (
    profile: AIProfile
  ) => Promise<{ success: boolean; latencyMs: number; error?: string }>
  fetchModels: (profile: AIProfile) => Promise<string[]>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  workspacePath: null,
  activeProfileId: null,
  profiles: [],
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const res = await window.forge.settings.get()
      if (res.success) {
        set({
          workspacePath: res.data.workspacePath,
          activeProfileId: res.data.activeProfileId,
          profiles: res.data.profiles
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    const res = await window.forge.settings.update(updates)
    if (res.success) {
      set((state) => ({
        ...state,
        ...updates
      }))
      return true
    }
    return false
  },

  saveProfile: async (profile) => {
    const res = await window.forge.settings.saveProfile(profile)
    if (res.success) {
      // Reload settings to get updated masked keys & correct state
      const settingsRes = await window.forge.settings.get()
      if (settingsRes.success) {
        set({
          profiles: settingsRes.data.profiles,
          activeProfileId: settingsRes.data.activeProfileId
        })
      }
      return true
    }
    return false
  },

  deleteProfile: async (id) => {
    const res = await window.forge.settings.deleteProfile(id)
    if (res.success) {
      // Reload settings
      const settingsRes = await window.forge.settings.get()
      if (settingsRes.success) {
        set({
          profiles: settingsRes.data.profiles,
          activeProfileId: settingsRes.data.activeProfileId
        })
      }
      return true
    }
    return false
  },

  selectWorkspace: async () => {
    const res = await window.forge.settings.selectWorkspace()
    if (res.success) {
      return res.data
    }
    return null
  },

  initializeWorkspace: async (path, profile) => {
    const res = await window.forge.settings.initializeWorkspace(path, profile)
    if (res.success) {
      set({
        workspacePath: path,
        activeProfileId: profile ? profile.id : null
      })
      return true
    }
    return false
  },

  testConnection: async (profile) => {
    const res = await window.forge.settings.testConnection(profile)
    if (res.success) {
      return res.data
    }
    return { success: false, latencyMs: 0, error: 'Connection test failed to run' }
  },

  fetchModels: async (profile) => {
    const res = await window.forge.settings.fetchModels(profile)
    if (res.success) {
      return res.data
    }
    return []
  }
}))
