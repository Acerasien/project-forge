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
  /**
   * Generates a stream of text tokens and tool calls from a history of messages.
   * @param messages The conversation history.
   * @param options Optional provider-specific settings.
   * @param signal An optional AbortSignal to cancel the generation.
   * @returns An async iterable yielding GenerationEvent objects.
   */
  generateStream(
    messages: Message[],
    options?: ProviderOptions,
    signal?: AbortSignal
  ): AsyncIterable<GenerationEvent>
}
