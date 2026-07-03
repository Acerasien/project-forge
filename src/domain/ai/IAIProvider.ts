import { Message } from './Message'
import { ICapability } from './ICapability'

export interface ProviderOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: ICapability[]
}

export type GenerationEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_end'; name: string; result: string }
  | { type: 'error'; error: string }

export interface IAIProvider {
  readonly name: string
  readonly supportsStreaming: boolean
  readonly supportsToolCalling: boolean
  readonly supportsVision: boolean
  readonly supportsReasoning: boolean

  testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }>
  fetchAvailableModels(): Promise<string[]>

  generateStream(
    messages: Message[],
    options?: ProviderOptions,
    signal?: AbortSignal
  ): AsyncIterable<GenerationEvent>
}
