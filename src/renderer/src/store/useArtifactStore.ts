import { create } from 'zustand'
import { ArtifactDTO, ArtifactRelationshipDTO } from '../../../shared/types/ipc'

interface ArtifactState {
  artifacts: ArtifactDTO[]
  relationships: ArtifactRelationshipDTO[]
  isLoading: boolean
  loadArtifacts: (initiativeId: string) => Promise<void>
  loadRelationships: (initiativeId: string) => Promise<void>
  updateContent: (id: string, content: string) => Promise<void>
  updateStatus: (
    id: string,
    status: string,
    bypassGates?: boolean
  ) => Promise<{ success: true } | { success: false; error: string; isGateWarning?: boolean }>
}

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  artifacts: [],
  relationships: [],
  isLoading: false,

  loadArtifacts: async (initiativeId: string) => {
    set({ isLoading: true })
    try {
      const res = await window.forge.artifacts.list(initiativeId)
      if (res.success) {
        set({ artifacts: res.data })
      } else {
        console.error('Failed to load artifacts:', res.error)
      }
    } finally {
      set({ isLoading: false })
    }
  },

  loadRelationships: async (initiativeId: string) => {
    try {
      const res = await window.forge.graph.getInitiativeGraph(initiativeId)
      if (res.success) {
        set({ relationships: res.data })
      } else {
        console.error('Failed to load relationships:', res.error)
      }
    } catch (e) {
      console.error(e)
    }
  },

  updateContent: async (id: string, content: string) => {
    const res = await window.forge.artifacts.updateContent(id, content)
    if (res.success) {
      set((state) => ({
        artifacts: state.artifacts.map((a) =>
          a.id === id
            ? { ...a, content, version: a.version + 1, updatedAt: new Date().toISOString() }
            : a
        )
      }))
    } else {
      throw new Error(res.error?.message || 'Failed to update content')
    }
  },

  updateStatus: async (id: string, status: string, bypassGates: boolean = false) => {
    const res = await window.forge.artifacts.updateStatus(id, status, bypassGates)
    if (res.success) {
      // Reload artifacts because downstream statuses might have changed (cascade)
      const artifact = get().artifacts.find((a) => a.id === id)
      if (artifact) {
        await get().loadArtifacts(artifact.initiativeId)
      }
      return { success: true }
    } else {
      return res as { success: false; error: string; isGateWarning?: boolean }
    }
  }
}))
