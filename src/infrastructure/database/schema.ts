import { Generated } from 'kysely'

export interface InitiativeTable {
  id: string // UUID
  name: string
  created_at: Generated<string>
}

export interface AIConversationTable {
  id: string
  initiative_id: string
  title: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface AIMessageTable {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: Generated<string>
}

export interface DatabaseSchema {
  initiatives: InitiativeTable
  ai_conversations: AIConversationTable
  ai_messages: AIMessageTable
}
