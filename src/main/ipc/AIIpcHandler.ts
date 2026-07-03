import { ipcMain } from 'electron'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'
import { GenerationRequest } from '../../domain/ai/GenerationRequest'
import { Conversation } from '../../domain/ai/Conversation'
import { ConversationDTO, MessageDTO, Result } from '../../shared/types/ipc'
import { randomUUID } from 'crypto'

export function registerAIIpcHandlers(runtime: WorkspaceRuntime): void {
  ipcMain.handle(
    'ai:createConversation',
    async (_, initiativeId: string, title?: string): Promise<Result<ConversationDTO>> => {
      try {
        const repo = runtime.getConversationRepository()
        const id = randomUUID()
        const conversation = new Conversation(
          id,
          initiativeId,
          title || 'New Conversation',
          new Date(),
          new Date()
        )
        await repo.createConversation(conversation)
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
        const repo = runtime.getConversationRepository()
        const convos = await repo.listConversations(initiativeId)
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
        const repo = runtime.getConversationRepository()
        const data = await repo.loadConversation(id)
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
    let aiService: any
    try {
      aiService = runtime.getAIGenerationService()
    } catch (err: any) {
      event.sender.send(`ai:stream:error:${id}`, `Workspace not initialized: ${err.message}`)
      return false
    }

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
    try {
      const aiService = runtime.getAIGenerationService()
      aiService.cancel(id)
      return true
    } catch {
      return false
    }
  })
}
