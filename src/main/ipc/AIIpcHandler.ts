import { ipcMain } from 'electron'
import { AIGenerationService } from '../../application/services/AIGenerationService'
import { IConversationRepository } from '../../domain/repositories/IConversationRepository'
import { GenerationRequest } from '../../domain/ai/GenerationRequest'
import { Conversation } from '../../domain/ai/Conversation'
import { ConversationDTO, MessageDTO, Result } from '../../shared/types/ipc'
import { randomUUID } from 'crypto'

export function registerAIIpcHandlers(
  aiService: AIGenerationService,
  conversationRepo: IConversationRepository
): void {
  ipcMain.handle(
    'ai:createConversation',
    async (_, initiativeId: string, title?: string): Promise<Result<ConversationDTO>> => {
      try {
        const id = randomUUID()
        const conversation = new Conversation(
          id,
          initiativeId,
          title || 'New Conversation',
          new Date(),
          new Date()
        )
        await conversationRepo.createConversation(conversation)
        return {
          success: true,
          data: {
            id: conversation.id,
            initiativeId: conversation.initiativeId,
            title: conversation.title,
            createdAt: conversation.createdAt.toISOString(),
            updatedAt: conversation.updatedAt.toISOString()
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: { code: 'AI_CREATE_CONVO_ERR', message: msg } }
      }
    }
  )

  ipcMain.handle(
    'ai:listConversations',
    async (_, initiativeId: string): Promise<Result<ConversationDTO[]>> => {
      try {
        const convos = await conversationRepo.listConversations(initiativeId)
        return {
          success: true,
          data: convos.map((c) => ({
            id: c.id,
            initiativeId: c.initiativeId,
            title: c.title,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString()
          }))
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: { code: 'AI_LIST_CONVO_ERR', message: msg } }
      }
    }
  )

  ipcMain.handle(
    'ai:loadConversation',
    async (
      _,
      id: string
    ): Promise<Result<{ conversation: ConversationDTO; messages: MessageDTO[] } | null>> => {
      try {
        const data = await conversationRepo.loadConversation(id)
        if (!data) return { success: true, data: null }

        return {
          success: true,
          data: {
            conversation: {
              id: data.conversation.id,
              initiativeId: data.conversation.initiativeId,
              title: data.conversation.title,
              createdAt: data.conversation.createdAt.toISOString(),
              updatedAt: data.conversation.updatedAt.toISOString()
            },
            messages: data.messages.map((m) => ({
              id: m.id,
              conversationId: m.conversationId,
              role: m.role,
              content: m.content,
              metadata: m.metadata,
              createdAt: m.createdAt.toISOString()
            }))
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: { code: 'AI_LOAD_CONVO_ERR', message: msg } }
      }
    }
  )

  ipcMain.handle('ai:generate', (event, id: string, request: GenerationRequest) => {
    const handleDestroyed = (): void => {
      aiService.cancel(id)
    }
    event.sender.once('destroyed', handleDestroyed)

    // Start generating asynchronously
    ;(async () => {
      try {
        const stream = aiService.generate(id, request)
        for await (const chunk of stream) {
          if (event.sender.isDestroyed()) {
            aiService.cancel(id)
            break
          }
          event.sender.send(`ai:stream:chunk:${id}`, chunk)
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send(`ai:stream:end:${id}`)
        }
      } catch (error) {
        if (!event.sender.isDestroyed()) {
          event.sender.send(
            `ai:stream:error:${id}`,
            error instanceof Error ? error.message : String(error)
          )
        }
      } finally {
        if (!event.sender.isDestroyed()) {
          event.sender.removeListener('destroyed', handleDestroyed)
        }
      }
    })()
    return true // Acknowledgement
  })

  ipcMain.handle('ai:cancel', (_event, id: string) => {
    aiService.cancel(id)
    return true
  })
}
