import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { ToolRegistry } from '../../tools'
import { ToolContext } from '../../tools/ITool'
import { ToolHandle } from '../../types/workspace'

interface WorkspaceHostProps {
  activeToolId: string
  context: ToolContext
}

export const WorkspaceHost = forwardRef<ToolHandle, WorkspaceHostProps>(
  ({ activeToolId, context }, ref) => {
    const activeTool = ToolRegistry.get(activeToolId)
    const previousToolRef = useRef<string | null>(null)

    useEffect(() => {
      if (!activeTool) return

      if (previousToolRef.current && previousToolRef.current !== activeTool.id) {
        const prevTool = ToolRegistry.get(previousToolRef.current)
        if (prevTool) prevTool.deactivate()
      }

      if (previousToolRef.current !== activeTool.id) {
        activeTool.activate(context)
        previousToolRef.current = activeTool.id
      }
    }, [activeToolId, context, activeTool])

    useEffect(() => {
      return () => {
        if (previousToolRef.current) {
          const prevTool = ToolRegistry.get(previousToolRef.current)
          if (prevTool) prevTool.deactivate()
        }
      }
    }, [])

    useImperativeHandle(ref, () => ({
      executeAICommand: (command) => {
        if (activeTool && activeTool.executeAICommand) {
          activeTool.executeAICommand(command, context)
        }
      }
    }))

    if (!activeTool) {
      return (
        <div className="flex h-full items-center justify-center text-forge-text-muted">
          Tool &apos;{activeToolId}&apos; not found in registry.
        </div>
      )
    }

    return <>{activeTool.render(context)}</>
  }
)
WorkspaceHost.displayName = 'WorkspaceHost'
