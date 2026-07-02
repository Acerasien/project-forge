export interface AppErrorDTO {
  code: string
  message: string
  dbPath?: string
}

export interface GenerationSubscription {
  onChunk: (cb: (text: string) => void) => GenerationSubscription
  onComplete: (cb: () => void) => GenerationSubscription
  onError: (cb: (error: string) => void) => GenerationSubscription
  cancel: () => void
}

export type Result<T> = { success: true; data: T } | { success: false; error: AppErrorDTO }

export interface InitiativeDTO {
  id: string
  name: string
  createdAt: string // ISO string for IPC safety
}

export interface MessageDTO {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ConversationDTO {
  id: string
  initiativeId: string
  title: string
  createdAt: string
  updatedAt: string
}

import type { GenerationRequest } from '../../domain/ai/GenerationRequest'

export interface IForgeAPI {
  initiatives: {
    create: (name: string) => Promise<Result<InitiativeDTO>>
    get: (id: string) => Promise<Result<InitiativeDTO | null>>
    list: () => Promise<Result<InitiativeDTO[]>>
    rename: (id: string, newName: string) => Promise<Result<InitiativeDTO>>
    delete: (id: string) => Promise<Result<void>>
  }
  ai: {
    createConversation: (initiativeId: string, title?: string) => Promise<Result<ConversationDTO>>
    listConversations: (initiativeId: string) => Promise<Result<ConversationDTO[]>>
    loadConversation: (
      id: string
    ) => Promise<Result<{ conversation: ConversationDTO; messages: MessageDTO[] } | null>>
    generate: (request: GenerationRequest) => GenerationSubscription
  }
  system: {
    getStatus: () => Promise<Result<void>>
    revealDatabase: () => Promise<void>
    resetDatabase: () => Promise<Result<void>>
  }
}
