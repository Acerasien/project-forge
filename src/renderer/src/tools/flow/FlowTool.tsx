/* eslint-disable react-refresh/only-export-components */
import React, { forwardRef } from 'react'
import { ITool, ToolContext } from '../ITool'
import { FlowHost } from '../../components/flow/FlowHost'
import { GraphData } from '../../components/flow/types'
import { ToolHandle } from '../../types/workspace'
import { documentManager } from '../../managers/DocumentManager'

// Connect to the Document System (Slice 5.2)
const FlowToolWrapper = forwardRef<ToolHandle, { context: ToolContext }>(({ context }, ref) => {
  if (!context.activeDocument) return null

  let graphData: GraphData
  try {
    graphData = JSON.parse(context.activeDocument.content)
  } catch {
    graphData = { nodes: [], edges: [] }
  }

  const handleChange = (newGraph: GraphData): void => {
    documentManager.updateContent(context.activeDocument!.id, JSON.stringify(newGraph, null, 2))
  }

  return (
    <FlowHost
      ref={ref}
      key={context.activeDocument.id}
      graphData={graphData}
      onChange={handleChange}
    />
  )
})
FlowToolWrapper.displayName = 'FlowToolWrapper'

export class FlowTool implements ITool {
  id = 'flow'
  displayName = 'FLOW'
  icon = 'flow-icon'

  private hostRef = React.createRef<ToolHandle>()

  activate(context: ToolContext): void {
    console.log(`[FlowTool] Activated for initiative ${context.initiativeId}`)
  }

  deactivate(): void {
    console.log(`[FlowTool] Deactivated`)
  }

  dispose(): void {
    console.log(`[FlowTool] Disposed`)
  }

  canOpen(document: unknown): boolean {
    if (typeof document === 'object' && document !== null && 'extension' in document) {
      const ext = (document as { extension: string }).extension
      return ext === 'flow'
    }
    return false
  }

  render(context: ToolContext): React.ReactNode {
    return <FlowToolWrapper ref={this.hostRef} context={context} />
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
