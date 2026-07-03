import { IAIProvider, GenerationEvent } from '../../domain/ai/IAIProvider'
import { GenerationRequest } from '../../domain/ai/GenerationRequest'
import { IConversationRepository } from '../../domain/repositories/IConversationRepository'
import { Message } from '../../domain/ai/Message'
import { randomUUID } from 'crypto'
import { CapabilityRegistry } from './CapabilityRegistry'

export class AIGenerationService {
  private activeGenerations = new Map<string, AbortController>()

  constructor(
    private provider: IAIProvider,
    private conversationRepository: IConversationRepository,
    private capabilityRegistry: CapabilityRegistry
  ) {}

  public async *generate(id: string, request: GenerationRequest): AsyncIterable<GenerationEvent> {
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
      let isDone = false
      while (!isDone) {
        if (abortController.signal.aborted) {
          wasInterrupted = true
          break
        }

        const stream = this.provider.generateStream(
          messages,
          {
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            tools: this.capabilityRegistry.getAll()
          },
          abortController.signal
        )

        let chunkResponse = ''
        let toolCallId = ''
        let toolCallName = ''
        let toolCallArgs = ''
        let hasToolCall = false

        for await (const event of stream) {
          yield event
          if (event.type === 'text') {
            chunkResponse += event.content
          } else if (event.type === 'tool_start') {
            toolCallName = event.name
            // We generate a UUID for the tool call since OpenAI streams deltas without a stable ID sometimes
            // Actually OpenAI gives an ID in the delta but OpenAIProvider was discarding it in our simplified model.
            // Wait, we need to pass the real tool call ID. Let's just generate one if not provided.
            toolCallId = `call_${randomUUID()}`
            hasToolCall = true
          } else if (event.type === 'tool_end') {
            toolCallArgs = event.result
          }
        }

        fullResponse += chunkResponse

        if (hasToolCall) {
          // 1. Add assistant message with tool call
          const assistantMsg = new Message(
            randomUUID(),
            request.conversationId,
            'assistant',
            chunkResponse, // Might be empty if it only returned a tool call
            new Date(),
            {
              toolCalls: [
                {
                  id: toolCallId,
                  name: toolCallName,
                  arguments: toolCallArgs
                }
              ]
            }
          )
          await this.conversationRepository.appendMessage(assistantMsg)
          messages.push(assistantMsg)

          // 2. Execute the tool
          const cap = this.capabilityRegistry.get(toolCallName)
          let resultSummary = ''

          if (!cap) {
            resultSummary = `Capability ${toolCallName} not found.`
          } else {
            try {
              let parsedArgs = {}
              try {
                parsedArgs = JSON.parse(toolCallArgs)
              } catch {
                // ignore
              }
              const res = await cap.execute(parsedArgs, { initiativeId: request.initiativeId })
              resultSummary = res.summary
            } catch (error: unknown) {
              resultSummary = `Error executing capability: ${error instanceof Error ? error.message : String(error)}`
            }
          }

          // 3. Add tool message with result
          const toolMsg = new Message(
            randomUUID(),
            request.conversationId,
            'tool',
            resultSummary,
            new Date(),
            {
              toolCallId: toolCallId
            }
          )
          await this.conversationRepository.appendMessage(toolMsg)
          messages.push(toolMsg)

          // Loop will continue and send the tool response back to the LLM
        } else {
          isDone = true
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        wasInterrupted = true
      } else {
        throw err
      }
    } finally {
      this.activeGenerations.delete(id)

      // Save the final assistant response to persistence if it wasn't just a tool call
      if (fullResponse.trim().length > 0 || wasInterrupted) {
        // Only if the last message wasn't already saved (i.e. we only want to save if there was a normal text response without a tool call,
        // since tool calls are saved immediately inside the loop).
        // Actually, if we didn't have a tool call in the last loop iteration, we need to save the final text response.
        const lastMsg = messages[messages.length - 1]
        if (lastMsg.role !== 'assistant') {
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
  }

  public cancel(id: string): void {
    const controller = this.activeGenerations.get(id)
    if (controller) {
      controller.abort()
      this.activeGenerations.delete(id)
    }
  }
}
