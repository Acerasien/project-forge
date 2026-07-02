import { IAIProvider } from '../../domain/ai/IAIProvider'
import { GenerationRequest } from '../../domain/ai/GenerationRequest'
import { IConversationRepository } from '../../domain/repositories/IConversationRepository'
import { Message } from '../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class AIGenerationService {
  private activeGenerations = new Map<string, AbortController>()

  constructor(
    private provider: IAIProvider,
    private conversationRepository: IConversationRepository
  ) {}

  public async *generate(id: string, request: GenerationRequest): AsyncIterable<string> {
    const abortController = new AbortController()
    this.activeGenerations.set(id, abortController)

    let messages: Message[] = []

    // 1. Fetch existing conversation or use provided messages
    if (request.messages) {
      messages = [...request.messages]
    } else {
      const data = await this.conversationRepository.loadConversation(request.conversationId)
      if (data) {
        messages = data.messages
      }
    }

    // 2. Append new user prompt if provided
    if (request.prompt) {
      // Prepend tool context to prompt if available
      let content = request.prompt
      if (request.toolContext) {
        content = `[Context: Active tool is ${request.toolContext.tool}${
          request.toolContext.documentId ? `, Document ID: ${request.toolContext.documentId}` : ''
        }]\n${content}`
      }

      const userMsg = new Message(randomUUID(), request.conversationId, 'user', content, new Date())

      // Save user message to persistence
      await this.conversationRepository.appendMessage(userMsg)
      messages.push(userMsg)
    }

    // Add system prompt override if provided
    if (request.systemPrompt) {
      messages.unshift(
        new Message(
          randomUUID(),
          request.conversationId,
          'system',
          request.systemPrompt,
          new Date()
        )
      )
    }

    let fullResponse = ''
    let wasInterrupted = false

    try {
      const stream = this.provider.generateStream(
        messages,
        {
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens
        },
        abortController.signal
      )

      for await (const chunk of stream) {
        fullResponse += chunk
        yield chunk
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        wasInterrupted = true
      } else {
        throw err
      }
    } finally {
      this.activeGenerations.delete(id)

      // Save assistant response to persistence, even if partial
      if (fullResponse.trim().length > 0) {
        const finalContent = wasInterrupted ? `${fullResponse}\n\n[Interrupted]` : fullResponse
        const assistantMsg = new Message(
          randomUUID(),
          request.conversationId,
          'assistant',
          finalContent,
          new Date()
        )
        await this.conversationRepository.appendMessage(assistantMsg)
      }
    }
  }

  public cancel(id: string): void {
    const controller = this.activeGenerations.get(id)
    if (controller) {
      controller.abort()
      this.activeGenerations.delete(id)
    }
  }
}
