import OpenAI from 'openai'
import { IAIProvider, ProviderOptions, GenerationEvent } from '../../domain/ai/IAIProvider'
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
  ): AsyncIterable<GenerationEvent> {
    // Map internal messages to OpenAI messages
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.metadata?.toolCallId || 'unknown'
        } as OpenAI.Chat.ChatCompletionToolMessageParam
      }

      if (m.role === 'assistant') {
        const msg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: m.content || null
        }
        if (m.metadata?.toolCalls && Array.isArray(m.metadata.toolCalls)) {
          msg.tool_calls = (m.metadata.toolCalls as any[]).map(
            (tc: { id: string; name: string; arguments?: Record<string, unknown> }) => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments || {})
              }
            })
          )
        }
        return msg
      }

      return {
        role: m.role as 'system' | 'user',
        content: m.content
      }
    })

    // Map capabilities to OpenAI tools
    const tools: OpenAI.Chat.ChatCompletionTool[] | undefined =
      options?.tools && options.tools.length > 0
        ? options.tools.map((cap) => ({
            type: 'function',
            function: {
              name: cap.name,
              description: cap.description,
              parameters: cap.parameters
            }
          }))
        : undefined

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: options?.model || 'gpt-4o',
          messages: openaiMessages,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          tools,
          stream: true
        },
        { signal }
      )

      // We need to aggregate tool calls since they are streamed as deltas
      let currentToolCall: { id: string; name: string; arguments: string } | null = null

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          yield { type: 'text', content: delta.content }
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            // New tool call starts
            if (tc.id) {
              // Yield previous tool call if any
              if (currentToolCall) {
                yield {
                  type: 'tool_end',
                  name: currentToolCall.name,
                  result: currentToolCall.arguments
                }
              }
              currentToolCall = {
                id: tc.id,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || ''
              }
              yield { type: 'tool_start', name: currentToolCall.name }
            } else if (currentToolCall && tc.function?.arguments) {
              currentToolCall.arguments += tc.function.arguments
            }
          }
        }
      }

      if (currentToolCall) {
        yield { type: 'tool_end', name: currentToolCall.name, result: currentToolCall.arguments }
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
