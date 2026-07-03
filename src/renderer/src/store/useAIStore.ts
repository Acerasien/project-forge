import { create } from 'zustand'
import { ConversationDTO, MessageDTO } from '@shared/types/ipc'

interface AIState {
  conversations: ConversationDTO[]
  activeConversationId: string | null
  messages: MessageDTO[]
  isGenerating: boolean

  // Actions
  setActiveConversation: (id: string | null) => void
  loadConversations: (initiativeId: string) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  createConversation: (initiativeId: string, title?: string) => Promise<string | null>
  appendOptimisticMessage: (message: MessageDTO) => void
  updateOptimisticMessage: (id: string, content: string) => void
  updateOptimisticMessageMetadata: (id: string, metadata: Record<string, unknown>) => void
  setGenerating: (generating: boolean) => void
}

export const useAIStore = create<AIState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isGenerating: false,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  loadConversations: async (initiativeId) => {
    const result = await window.forge.ai.listConversations(initiativeId)
    if (result.success) {
      set({ conversations: result.data })
    }
  },

  loadMessages: async (conversationId) => {
    const result = await window.forge.ai.loadConversation(conversationId)
    if (result.success && result.data) {
      set({ messages: result.data.messages })
    }
  },

  createConversation: async (initiativeId, title) => {
    const result = await window.forge.ai.createConversation(initiativeId, title)
    if (result.success) {
      const newConvo = result.data
      set((state) => ({
        conversations: [newConvo, ...state.conversations],
        activeConversationId: newConvo.id,
        messages: []
      }))
      return newConvo.id
    }
    return null
  },

  appendOptimisticMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },

  updateOptimisticMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    }))
  },

  updateOptimisticMessageMetadata: (id, metadata) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, metadata: { ...(msg.metadata || {}), ...metadata } } : msg
      )
    }))
  },

  setGenerating: (generating) => set({ isGenerating: generating })
}))
