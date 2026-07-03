import { Generated } from 'kysely'

export interface InitiativeTable {
  id: string // UUID
  name: string
  description: string | null
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
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
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  metadata: string | null
  created_at: Generated<string>
}

export interface DocumentTable {
  id: string
  initiative_id: string
  name: string
  extension: string
  content: string
  preferred_tool_id: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface ArtifactTable {
  id: string
  initiative_id: string
  type: string
  title: string
  content: string | null
  status: string
  version: number
  generated_by_capability_id?: string | null
  generated_by_capability_version?: string | null
  generated_workflow_id?: string | null
  generation_session_id?: string | null
  generated_at?: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface ArtifactRelationshipTable {
  id: string
  source_id: string
  target_id: string
  type: string
  created_at: Generated<string>
}

export interface ArtifactIntelligenceTable {
  id: string
  artifact_id: string
  completeness_score: number | null
  ai_confidence: number | null
  critique_summary: string | null
  detected_risks: string | null
  assumptions: string | null
  suggested_improvements: string | null
  validation_model: string | null
  is_stale: boolean | number
  last_validated_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface DatabaseSchema {
  initiatives: InitiativeTable
  ai_conversations: AIConversationTable
  ai_messages: AIMessageTable
  documents: DocumentTable
  artifacts: ArtifactTable
  artifact_relationships: ArtifactRelationshipTable
  artifact_intelligence: ArtifactIntelligenceTable
}
