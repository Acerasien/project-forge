export interface ToolHandle {
  executeAICommand: (
    prompt: string,
    options: { conversationId: string; initiativeId: string }
  ) => void
  cancelAICommand?: () => void
}
