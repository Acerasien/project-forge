import { create } from 'zustand'
import { InitiativeDTO } from '@shared/types/ipc'

interface InitiativeState {
  initiatives: InitiativeDTO[]
  activeInitiativeId: string | null
  isLoading: boolean
  error: string | null

  fetchInitiatives: () => Promise<void>
  createInitiative: (name: string) => Promise<void>
  setActiveInitiative: (id: string | null) => void
}

export const useInitiativeStore = create<InitiativeState>((set, get) => ({
  initiatives: [],
  activeInitiativeId: null,
  isLoading: false,
  error: null,

  fetchInitiatives: async () => {
    set({ isLoading: true, error: null })
    const result = await window.forge.initiatives.list()
    if (result.success) {
      set({ initiatives: result.data, isLoading: false })
    } else {
      set({ error: result.error.message, isLoading: false })
    }
  },

  createInitiative: async (name: string) => {
    const result = await window.forge.initiatives.create(name)
    if (result.success) {
      set({
        initiatives: [...get().initiatives, result.data],
        activeInitiativeId: result.data.id
      })
    } else {
      set({ error: result.error.message })
    }
  },

  setActiveInitiative: (id: string | null) => {
    set({ activeInitiativeId: id })
  }
}))
