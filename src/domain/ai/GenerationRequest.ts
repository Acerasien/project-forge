import { Message } from './Message'

export interface ToolContext {
  tool: 'editor' | 'flow' | 'terminal'
  documentId?: string
}

export interface GenerationRequest {
  conversationId: string
  initiativeId: string
  messages?: Message[] // Optional override, otherwise fetched from repository
  prompt?: string // The new prompt to append
  systemPrompt?: string
  toolContext?: ToolContext
  model?: string
  temperature?: number
  maxTokens?: number
}
