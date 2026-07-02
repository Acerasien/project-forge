import OpenAI from 'openai'
import { IAIProvider, ProviderOptions } from '../../domain/ai/IAIProvider'
import { Message } from '../../domain/ai/Message'

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async *generateStream(
    messages: Message[],
    options?: ProviderOptions,
    signal?: AbortSignal
  ): AsyncIterable<string> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content
    }))

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: options?.model || 'gpt-4o',
          messages: openaiMessages,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          stream: true
        },
        { signal }
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          yield content
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      if (error instanceof OpenAI.APIError) {
        throw new Error(`[AI_PROVIDER_ERROR] ${error.status}: ${error.message}`)
      }
      throw new Error(
        `[AI_NETWORK_ERROR] Failed to communicate with provider: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
