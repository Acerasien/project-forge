export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export class Message {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly role: MessageRole,
    public readonly content: string,
    public readonly createdAt: Date,
    public readonly metadata?: Record<string, unknown>
  ) {}
}
