import { ReactNode } from 'react'
import { DocumentDTO } from '@shared/types/ipc'

export interface ToolContext {
  initiativeId: string
  conversationId: string | null
  activeDocument: DocumentDTO | null
}

export interface ITool {
  id: string
  displayName: string
  icon?: ReactNode // E.g. an SVG component or string identifier

  activate(context: ToolContext): void
  deactivate(): void
  dispose(): void

  // Returns true if this tool can handle the given document extension or type.
  // E.g. canOpen(document: { extension: string }): boolean
  // Currently simplified for future Slice 5.2 usage.
  canOpen?(document: unknown): boolean

  render(context: ToolContext): ReactNode

  executeAICommand?(command: string, context: ToolContext): void
}
