import { Message } from './Message'

export interface ProviderOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface IAIProvider {
  /**
   * Generates a stream of text tokens from a history of messages.
   * @param messages The conversation history.
   * @param options Optional provider-specific settings.
   * @param signal An optional AbortSignal to cancel the generation.
   * @returns An async iterable yielding string chunks.
   */
  generateStream(
    messages: Message[],
    options?: ProviderOptions,
    signal?: AbortSignal
  ): AsyncIterable<string>
}
