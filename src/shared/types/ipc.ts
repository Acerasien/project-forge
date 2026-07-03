export interface AppErrorDTO {
  code: string
  message: string
  dbPath?: string
}

export type GenerationEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_end'; name: string; result: string }
  | { type: 'error'; error: string }

export interface GenerationSubscription {
  onChunk: (cb: (event: GenerationEvent) => void) => GenerationSubscription
  onComplete: (cb: () => void) => GenerationSubscription
  onError: (cb: (error: string) => void) => GenerationSubscription
  cancel: () => void
}

export type Result<T> = { success: true; data: T } | { success: false; error: AppErrorDTO }

export interface InitiativeDTO {
  id: string
  name: string
  description: string | null
  status: 'Discovery' | 'InProgress' | 'Released' | 'Archived'
  createdAt: string // ISO string for IPC safety
  updatedAt: string
}

export interface MessageDTO {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ConversationDTO {
  id: string
  initiativeId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface DocumentDTO {
  id: string
  initiativeId: string
  name: string
  extension: string
  content: string
  preferredToolId: string | null
  createdAt: string
  updatedAt: string
}

export interface ArtifactDTO {
  id: string
  initiativeId: string
  type: 'Vision' | 'Requirements' | 'Architecture' | 'SystemDesign'
  title: string
  content: string | null
  status: 'Draft' | 'Approved' | 'NeedsReview'
  version: number
  createdAt: string
  updatedAt: string
}

export interface ArtifactRelationshipDTO {
  id: string
  sourceId: string
  targetId: string
  type: 'DerivedFrom' | 'InformedBy' | 'DecidedBy' | 'Implements' | 'Generated' | 'SupersededBy'
  createdAt: string
}

export interface ArtifactIntelligenceDTO {
  id: string
  artifactId: string
  completenessScore: number | null
  aiConfidence: number | null
  critiqueSummary: string | null
  detectedRisks: string | null
  assumptions: string | null
  suggestedImprovements: string | null
  validationModel: string | null
  isStale: boolean
  lastValidatedAt: string | null
  createdAt: string
  updatedAt: string
}

import type { GenerationRequest } from '../../domain/ai/GenerationRequest'
import type { AgentEvent } from '../../domain/ai/IAgent'

export interface AgentSubscription {
  onEvent: (cb: (event: AgentEvent) => void) => AgentSubscription
}

export interface IForgeAPI {
  initiatives: {
    create: (name: string) => Promise<Result<InitiativeDTO>>
    get: (id: string) => Promise<Result<InitiativeDTO | null>>
    list: () => Promise<Result<InitiativeDTO[]>>
    rename: (id: string, newName: string) => Promise<Result<InitiativeDTO>>
    delete: (id: string) => Promise<Result<void>>
  }
  documents: {
    create: (
      initiativeId: string,
      name: string,
      extension: string,
      content: string,
      preferredToolId?: string | null
    ) => Promise<Result<DocumentDTO>>
    get: (id: string) => Promise<Result<DocumentDTO | null>>
    list: (initiativeId: string) => Promise<Result<DocumentDTO[]>>
    update: (id: string, content: string) => Promise<Result<void>>
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
  artifacts: {
    list: (initiativeId: string) => Promise<Result<ArtifactDTO[]>>
    get: (id: string) => Promise<Result<ArtifactDTO | null>>
    updateContent: (id: string, content: string) => Promise<Result<void>>
    updateStatus: (
      id: string,
      status: string,
      bypassGates?: boolean
    ) => Promise<{ success: true } | { success: false; error: string; isGateWarning?: boolean }>
  }
  graph: {
    getInitiativeGraph: (initiativeId: string) => Promise<Result<ArtifactRelationshipDTO[]>>
    createRelationship: (
      sourceId: string,
      targetId: string,
      type: string
    ) => Promise<Result<ArtifactRelationshipDTO>>
  }
  validation: {
    reviewArtifact: (artifactId: string) => Promise<Result<ArtifactIntelligenceDTO>>
    getLatestIntelligence: (artifactId: string) => Promise<Result<ArtifactIntelligenceDTO | null>>
  }
  agent: {
    executeGoal: (goal: string, initiativeId: string) => AgentSubscription
  }
}
