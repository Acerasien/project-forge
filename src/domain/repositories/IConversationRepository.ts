import { Conversation } from '../ai/Conversation'
import { Message } from '../ai/Message'

export interface IConversationRepository {
  createConversation(conversation: Conversation): Promise<void>
  loadConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] } | null>
  listConversations(initiativeId: string): Promise<Conversation[]>
  appendMessage(message: Message): Promise<void>
}
