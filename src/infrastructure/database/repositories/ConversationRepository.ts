import { IConversationRepository } from '@domain/repositories/IConversationRepository'
import { Conversation } from '@domain/ai/Conversation'
import { Message, MessageRole } from '@domain/ai/Message'
import { KyselyAdapter } from '../KyselyAdapter'

export class ConversationRepository implements IConversationRepository {
  constructor(private adapter: KyselyAdapter) {}

  public async createConversation(conversation: Conversation): Promise<void> {
    const db = this.adapter.getKysely()

    await db
      .insertInto('ai_conversations')
      .values({
        id: conversation.id,
        initiative_id: conversation.initiativeId,
        title: conversation.title,
        created_at: conversation.createdAt.toISOString(),
        updated_at: conversation.updatedAt.toISOString()
      })
      .execute()
  }

  public async loadConversation(
    id: string
  ): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const db = this.adapter.getKysely()

    const row = await db
      .selectFrom('ai_conversations')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) return null

    const conversation = new Conversation(
      row.id,
      row.initiative_id,
      row.title,
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    )

    const msgRows = await db
      .selectFrom('ai_messages')
      .selectAll()
      .where('conversation_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute()

    const messages = msgRows.map(
      (msgRow) =>
        new Message(
          msgRow.id,
          msgRow.conversation_id,
          msgRow.role as MessageRole,
          msgRow.content,
          new Date(msgRow.created_at as string)
        )
    )

    return { conversation, messages }
  }

  public async listConversations(initiativeId: string): Promise<Conversation[]> {
    const db = this.adapter.getKysely()

    const rows = await db
      .selectFrom('ai_conversations')
      .selectAll()
      .where('initiative_id', '=', initiativeId)
      .orderBy('updated_at', 'desc')
      .execute()

    return rows.map(
      (row) =>
        new Conversation(
          row.id,
          row.initiative_id,
          row.title,
          new Date(row.created_at as string),
          new Date(row.updated_at as string)
        )
    )
  }

  public async appendMessage(message: Message): Promise<void> {
    const db = this.adapter.getKysely()

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto('ai_messages')
        .values({
          id: message.id,
          conversation_id: message.conversationId,
          role: message.role,
          content: message.content,
          created_at: message.createdAt.toISOString()
        })
        .execute()

      await trx
        .updateTable('ai_conversations')
        .set({ updated_at: message.createdAt.toISOString() })
        .where('id', '=', message.conversationId)
        .execute()
    })
  }
}
