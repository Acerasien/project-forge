/* eslint-disable react-refresh/only-export-components */
import React, { forwardRef } from 'react'
import { ITool, ToolContext } from '../ITool'
import { EditorHost } from '../../components/editor/EditorHost'
import { ToolHandle } from '../../types/workspace'
import { documentManager } from '../../managers/DocumentManager'

// Connect to the Document System (Slice 5.2)
const EditorToolWrapper = forwardRef<ToolHandle, { context: ToolContext }>(({ context }, ref) => {
  if (!context.activeDocument) return null

  return (
    <EditorHost
      ref={ref}
      key={context.activeDocument.id}
      initialDoc={context.activeDocument.content}
      onChange={(content) => documentManager.updateContent(context.activeDocument!.id, content)}
    />
  )
})
EditorToolWrapper.displayName = 'EditorToolWrapper'

export class EditorTool implements ITool {
  id = 'editor'
  displayName = 'CODE'
  icon = 'editor-icon'

  private hostRef = React.createRef<ToolHandle>()

  activate(context: ToolContext): void {
    console.log(`[EditorTool] Activated for initiative ${context.initiativeId}`)
  }

  deactivate(): void {
    console.log(`[EditorTool] Deactivated`)
  }

  dispose(): void {
    console.log(`[EditorTool] Disposed`)
  }

  canOpen(document: unknown): boolean {
    if (typeof document === 'object' && document !== null && 'extension' in document) {
      const ext = (document as { extension: string }).extension
      return ext === 'ts' || ext === 'md'
    }
    return false
  }

  render(context: ToolContext): React.ReactNode {
    return <EditorToolWrapper ref={this.hostRef} context={context} />
  }

  executeAICommand(command: string, context: ToolContext): void {
    if (this.hostRef.current && context.conversationId) {
      this.hostRef.current.executeAICommand(command, {
        conversationId: context.conversationId,
        initiativeId: context.initiativeId
      })
    }
  }
}
